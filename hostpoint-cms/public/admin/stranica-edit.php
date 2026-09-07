<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : null;
$row = null;
if ($id !== null) {
    $stmt = $db->prepare('SELECT * FROM stranice WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/stranice.php');
        exit;
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    $naslovHr = trim((string) ($_POST['naslov_hr'] ?? ''));
    $naslovDe = trim((string) ($_POST['naslov_de'] ?? ''));
    $uvodHr = trim((string) ($_POST['uvod_hr'] ?? ''));
    $uvodDe = trim((string) ($_POST['uvod_de'] ?? ''));
    // Markdown izvor — namjerno bez trim() nad cijelim sadržajem (vodeći/prateći
    // razmaci unutar teksta ne smetaju, a trim bi mogao pojesti namjerno
    // prazne redove na krajevima kod copy-paste iz drugog izvora).
    $sadrzajHr = (string) ($_POST['sadrzaj_hr'] ?? '');
    $sadrzajDe = (string) ($_POST['sadrzaj_de'] ?? '');
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($naslovHr === '') {
        $errors[] = 'Naslov (HR) je obavezan.';
    }
    if ($slug === '' || !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        $errors[] = 'Slug je obavezan i smije sadržavati samo mala slova, brojeve i crtice (npr. "moja-stranica").';
    } else {
        $dupStmt = $row
            ? $db->prepare('SELECT id FROM stranice WHERE slug = ? AND id != ?')
            : $db->prepare('SELECT id FROM stranice WHERE slug = ?');
        $dupStmt->execute($row ? [$slug, $row['id']] : [$slug]);
        if ($dupStmt->fetch()) {
            $errors[] = "Slug \"{$slug}\" je već zauzet.";
        }
    }

    if (!$errors) {
        $params = [$slug, $naslovHr, $naslovDe ?: null, $uvodHr ?: null, $uvodDe ?: null, $sadrzajHr ?: null, $sadrzajDe ?: null, $status];
        if ($row) {
            $db->prepare(
                'UPDATE stranice SET slug=?, naslov_hr=?, naslov_de=?, uvod_hr=?, uvod_de=?, sadrzaj_hr=?, sadrzaj_de=?, status=? WHERE id=?'
            )->execute([...$params, $row['id']]);
            header('Location: /admin/stranice.php?msg=' . rawurlencode('Stranica ažurirana.'));
            exit;
        }

        $db->prepare(
            'INSERT INTO stranice (slug, naslov_hr, naslov_de, uvod_hr, uvod_de, sadrzaj_hr, sadrzaj_de, status) VALUES (?,?,?,?,?,?,?,?)'
        )->execute($params);
        header('Location: /admin/stranice.php?msg=' . rawurlencode('Stranica kreirana.'));
        exit;
    }
}

$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start($isEdit ? 'Uredi stranicu' : 'Nova stranica', 'stranice', $user, true);
?>
  <p><a href="/admin/stranice.php">&larr; Natrag na listu</a></p>
  <h2><?= $isEdit ? 'Uredi stranicu' : 'Nova stranica' ?></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Slug (dio URL-a) *
      <input type="text" name="slug" value="<?= $v('slug') ?>" placeholder="npr. impressum" required>
    </label>
    <p class="hint">Mora odgovarati stvarnoj ruti na sajtu: kontakt, postani-clan, impressum, datenschutzerklarung — ili nova ruta koju frontend očekuje.</p>

    <label>Naslov (HR) *
      <input type="text" name="naslov_hr" value="<?= $v('naslov_hr') ?>" required>
    </label>
    <label>Naslov (DE)
      <input type="text" name="naslov_de" value="<?= $v('naslov_de') ?>">
    </label>

    <label>Uvodni tekst (HR)
      <textarea name="uvod_hr" rows="2"><?= $v('uvod_hr') ?></textarea>
    </label>
    <label>Uvodni tekst (DE)
      <textarea name="uvod_de" rows="2"><?= $v('uvod_de') ?></textarea>
    </label>

    <label>Sadržaj (HR) — Markdown
      <textarea name="sadrzaj_hr" rows="16" class="admin-textarea-mono"><?= $v('sadrzaj_hr') ?></textarea>
    </label>
    <label>Sadržaj (DE) — Markdown
      <textarea name="sadrzaj_de" rows="16" class="admin-textarea-mono"><?= $v('sadrzaj_de') ?></textarea>
    </label>
    <p class="hint">
      Podržano: prazan red = novi pasus, Enter unutar pasusa = prijelom reda &middot;
      <strong>**bold**</strong> &middot; <em>*italic*</em> &middot; <code>## Naslov</code> / <code>### Podnaslov</code> &middot;
      <code>&gt; citat</code> &middot; <code>- stavka</code> liste &middot; <code>1. stavka</code> numerirane liste &middot;
      <code>[tekst](https://...)</code> poveznica (dozvoljeno: http(s), mailto:, tel:).
    </p>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj stranicu' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>
