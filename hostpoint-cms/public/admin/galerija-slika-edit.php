<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : 0;
$stmt = $db->prepare('SELECT s.*, g.naziv_hr FROM galerija_slike s JOIN galerije g ON g.id = s.galerija_id WHERE s.id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();
if (!$row) {
    header('Location: /admin/galerije.php');
    exit;
}
$back = '/admin/galerija-slike.php?galerija=' . (int) $row['galerija_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $alt = trim((string) ($_POST['alt'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);
    $db->prepare('UPDATE galerija_slike SET alt=?, redoslijed=? WHERE id=?')->execute([$alt ?: null, $redoslijed, $id]);
    header('Location: ' . $back . '&msg=' . rawurlencode('Slika ažurirana.'));
    exit;
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/galerije';
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start('Uredi sliku · ' . $row['naziv_hr'], 'galerije', $user, true);
?>
  <p><a href="<?= $back ?>">&larr; Natrag na slike</a></p>
  <h2>Uredi sliku <span class="hint" style="display:inline;font-weight:400">— <?= htmlspecialchars($row['naziv_hr'], ENT_QUOTES) ?></span></h2>

  <div class="current-logo">
    <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_medium'], ENT_QUOTES) ?>" alt="" style="width:240px;height:auto;max-height:240px;object-fit:contain">
    <span class="hint"><?= (int) $row['slika_width'] ?>×<?= (int) $row['slika_height'] ?>. Za zamjenu slike obrišite ovu i uploadajte novu.</span>
  </div>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>
    <label>Alt tekst / opis
      <input type="text" name="alt" value="<?= $v('alt') ?>" placeholder="prazno = na sajtu se koristi &quot;Naziv galerije N&quot;">
    </label>
    <label>Redoslijed prikaza (niži broj = ranije; najniži = cover)
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>
    <button type="submit" class="btn btn-primary">Spremi izmjene</button>
  </form>
<?php hnkcms_admin_page_end(); ?>
