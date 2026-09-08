<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();
$uploadsDir = __DIR__ . '/../uploads/klub';
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/klub';

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : null;
$row = null;
if ($id !== null) {
    $stmt = $db->prepare('SELECT * FROM klub_timeline WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/klub.php');
        exit;
    }
}

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $t = fn(string $k) => trim(str_replace("\r\n", "\n", (string) ($_POST[$k] ?? '')));
    $godina = (int) ($_POST['godina'] ?? 0);
    $vals = [
        'godina' => $godina,
        'godina_labela_hr' => $t('godina_labela_hr') ?: null,
        'godina_labela_de' => $t('godina_labela_de') ?: null,
        'naslov_hr' => $t('naslov_hr'),
        'naslov_de' => $t('naslov_de') ?: null,
        'tekst_hr' => $t('tekst_hr'),
        'tekst_de' => $t('tekst_de') ?: null,
        'slika_alt' => $t('slika_alt') ?: null,
        'redoslijed' => (int) ($_POST['redoslijed'] ?? 100),
    ];
    if ($godina < 1900 || $godina > 2100) {
        $errors[] = 'Godina mora biti između 1900 i 2100.';
    }
    if ($vals['naslov_hr'] === '' || $vals['tekst_hr'] === '') {
        $errors[] = 'Naslov (HR) i tekst (HR) su obavezni.';
    }

    if (!$errors) {
        $cols = array_keys($vals);
        if ($row) {
            $db->prepare('UPDATE klub_timeline SET ' . implode(', ', array_map(fn($c) => "{$c}=?", $cols)) . ' WHERE id=?')
                ->execute([...array_values($vals), $row['id']]);
            $targetId = (int) $row['id'];
        } else {
            $db->prepare('INSERT INTO klub_timeline (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')')
                ->execute(array_values($vals));
            $targetId = (int) $db->lastInsertId();
        }

        if (!empty($_POST['ukloni_sliku']) && $row && $row['slika_small']) {
            $db->prepare('UPDATE klub_timeline SET slika_original=NULL, slika_small=NULL, slika_medium=NULL, slika_large=NULL, slika_is_vector=0, slika_width=NULL, slika_height=NULL WHERE id=?')->execute([$targetId]);
            WebpPipeline::delete($uploadsDir, $row, 'slika');
        } elseif (!empty($_FILES['slika']['name'])) {
            try {
                $d = WebpPipeline::process($_FILES['slika'], $uploadsDir, $targetId, 'timeline', WebpPipeline::WIDTHS_WIDE);
                $db->prepare('UPDATE klub_timeline SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
                    ->execute([$d['original'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $targetId]);
                if ($row && $row['slika_small']) {
                    WebpPipeline::delete($uploadsDir, $row, 'slika');
                }
            } catch (LogoUploadError $e) {
                header('Location: /admin/klub.php?msg=' . rawurlencode('Stavka spremljena, ALI slika nije uspjela: ' . $e->getMessage()));
                exit;
            }
        }
        header('Location: /admin/klub.php?msg=' . rawurlencode($row ? 'Stavka ažurirana.' : 'Stavka kreirana.'));
        exit;
    }
}

$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start($isEdit ? 'Uredi stavku timelinea' : 'Nova stavka timelinea', 'klub', $user, true);
?>
  <p><a href="/admin/klub.php">&larr; Natrag</a></p>
  <h2><?= $isEdit ? 'Uredi stavku timelinea' : 'Nova stavka timelinea' ?></h2>
  <?php foreach ($errors as $err): ?><p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p><?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>
    <label>Godina (za sortiranje) *
      <input type="number" name="godina" min="1900" max="2100" value="<?= $v('godina') ?>" required>
    </label>
    <label>Prikazana godina (HR) — neobavezno, npr. "Kasne 1990-e" ili "Danas"
      <input type="text" name="godina_labela_hr" value="<?= $v('godina_labela_hr') ?>">
    </label>
    <label>Prikazana godina (DE)
      <input type="text" name="godina_labela_de" value="<?= $v('godina_labela_de') ?>">
    </label>
    <label>Naslov (HR) *
      <input type="text" name="naslov_hr" value="<?= $v('naslov_hr') ?>" required>
    </label>
    <label>Naslov (DE)
      <input type="text" name="naslov_de" value="<?= $v('naslov_de') ?>">
    </label>
    <label>Tekst (HR) * — običan tekst, novi redovi se čuvaju
      <textarea name="tekst_hr" rows="5" required><?= $v('tekst_hr') ?></textarea>
    </label>
    <label>Tekst (DE)
      <textarea name="tekst_de" rows="5"><?= $v('tekst_de') ?></textarea>
    </label>

    <label>Slika (neobavezno, 16:9)<?= $isEdit ? ' — prazno zadržava postojeću' : '' ?>
      <input type="file" name="slika" accept="image/png,image/jpeg,image/webp">
    </label>
    <?php if ($isEdit && $row['slika_small']): ?>
      <div class="current-logo current-photo">
        <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_small'], ENT_QUOTES) ?>" alt="">
        <label style="display:inline-flex;gap:.4rem;align-items:center"><input type="checkbox" name="ukloni_sliku" value="1"> Ukloni sliku</label>
      </div>
    <?php endif; ?>
    <label>Alt tekst slike
      <input type="text" name="slika_alt" value="<?= $v('slika_alt') ?>">
    </label>
    <label>Redoslijed (unutar iste godine)
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>
    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj stavku' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>
