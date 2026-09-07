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
    $stmt = $db->prepare('SELECT * FROM galerije WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/galerije.php');
        exit;
    }
}

$kategorije = ['sport' => 'Sport i turniri', 'feste' => 'Zabave i feste'];
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    $nazivHr = trim((string) ($_POST['naziv_hr'] ?? ''));
    $nazivDe = trim((string) ($_POST['naziv_de'] ?? ''));
    $kategorija = (string) ($_POST['kategorija'] ?? '');
    $godinaRaw = trim((string) ($_POST['godina'] ?? ''));
    $datum = trim((string) ($_POST['datum'] ?? ''));
    $opisHr = trim((string) ($_POST['opis_hr'] ?? ''));
    $opisDe = trim((string) ($_POST['opis_de'] ?? ''));
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($nazivHr === '') {
        $errors[] = 'Naziv (HR) je obavezan.';
    }
    if (!isset($kategorije[$kategorija])) {
        $errors[] = 'Kategorija je obavezna.';
    }
    $godina = ctype_digit($godinaRaw) ? (int) $godinaRaw : 0;
    if ($godina < 1990 || $godina > 2100) {
        $errors[] = 'Godina mora biti između 1990 i 2100.';
    }
    if ($datum !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datum)) {
        $errors[] = 'Datum mora biti u obliku GGGG-MM-DD.';
    }
    if ($slug === '' || !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        $errors[] = 'Slug je obavezan i smije sadržavati samo mala slova, brojeve i crtice (npr. "zabavna-vecer-2026").';
    } else {
        $dupStmt = $row
            ? $db->prepare('SELECT id FROM galerije WHERE slug = ? AND id != ?')
            : $db->prepare('SELECT id FROM galerije WHERE slug = ?');
        $dupStmt->execute($row ? [$slug, $row['id']] : [$slug]);
        if ($dupStmt->fetch()) {
            $errors[] = "Slug \"{$slug}\" je već zauzet.";
        }
    }

    if (!$errors) {
        $params = [$slug, $nazivHr, $nazivDe ?: null, $kategorija, $godina, $datum ?: null, $opisHr ?: null, $opisDe ?: null, $status];
        if ($row) {
            $db->prepare('UPDATE galerije SET slug=?, naziv_hr=?, naziv_de=?, kategorija=?, godina=?, datum=?, opis_hr=?, opis_de=?, status=? WHERE id=?')
                ->execute([...$params, $row['id']]);
            header('Location: /admin/galerije.php?msg=' . rawurlencode('Galerija ažurirana.'));
            exit;
        }
        $db->prepare('INSERT INTO galerije (slug, naziv_hr, naziv_de, kategorija, godina, datum, opis_hr, opis_de, status) VALUES (?,?,?,?,?,?,?,?,?)')
            ->execute($params);
        $newId = (int) $db->lastInsertId();
        header('Location: /admin/galerija-slike.php?galerija=' . $newId . '&msg=' . rawurlencode('Galerija kreirana — dodajte slike.'));
        exit;
    }
}

$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);
$selKat = (string) ($_POST['kategorija'] ?? $row['kategorija'] ?? '');

hnkcms_admin_page_start($isEdit ? 'Uredi galeriju' : 'Nova galerija', 'galerije', $user, true);
?>
  <p><a href="/admin/galerije.php">&larr; Natrag na listu</a>
    <?php if ($isEdit): ?> &middot; <a href="/admin/galerija-slike.php?galerija=<?= (int) $row['id'] ?>">Slike ove galerije &rarr;</a><?php endif; ?>
  </p>
  <h2><?= $isEdit ? 'Uredi galeriju' : 'Nova galerija' ?></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Naziv (HR) *
      <input type="text" name="naziv_hr" value="<?= $v('naziv_hr') ?>" required>
    </label>
    <label>Naziv (DE)
      <input type="text" name="naziv_de" value="<?= $v('naziv_de') ?>">
    </label>

    <label>Slug (dio URL-a) *
      <input type="text" name="slug" value="<?= $v('slug') ?>" placeholder="npr. zabavna-vecer-2026" required>
    </label>
    <p class="hint">Ruta na sajtu: /galerija/&lt;slug&gt;. Postojeći slugovi su preslikani sa starog sajta (redirecti) — ne mijenjati bez razloga.</p>

    <label>Kategorija *
      <select name="kategorija" required>
        <option value="" <?= $selKat === '' ? 'selected' : '' ?>>— odaberi —</option>
        <?php foreach ($kategorije as $val => $label): ?>
          <option value="<?= $val ?>" <?= $selKat === $val ? 'selected' : '' ?>><?= $label ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <label>Godina * <span class="hint" style="display:inline">(grupisanje na stranici galerija)</span>
      <input type="number" name="godina" min="1990" max="2100" value="<?= $v('godina', (string) (int) date('Y')) ?>" required>
    </label>
    <label>Datum (opciono, za sortiranje unutar godine i prikaz na stranici)
      <input type="date" name="datum" value="<?= $v('datum') ?>">
    </label>

    <label>Opis (HR)
      <textarea name="opis_hr" rows="3"><?= $v('opis_hr') ?></textarea>
    </label>
    <label>Opis (DE)
      <textarea name="opis_de" rows="3"><?= $v('opis_de') ?></textarea>
    </label>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj galeriju i dodaj slike' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>
