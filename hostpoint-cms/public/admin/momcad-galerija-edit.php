<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : 0;
$stmt = $db->prepare('SELECT g.*, m.naziv_hr FROM momcad_galerija g JOIN momcadi m ON m.id = g.momcad_id WHERE g.id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();
if (!$row) {
    header('Location: /admin/momcadi.php');
    exit;
}
$back = '/admin/momcad-sastav.php?momcad=' . (int) $row['momcad_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $alt = trim((string) ($_POST['alt'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);
    $db->prepare('UPDATE momcad_galerija SET alt=?, redoslijed=? WHERE id=?')->execute([$alt ?: null, $redoslijed, $id]);
    header('Location: ' . $back . '&msg=' . rawurlencode('Slika ažurirana.'));
    exit;
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start('Uredi sliku galerije · ' . $row['naziv_hr'], 'momcadi', $user, true);
?>
  <p><a href="<?= $back ?>">&larr; Natrag na sastav</a></p>
  <h2>Uredi sliku galerije <span class="hint" style="display:inline;font-weight:400">— <?= htmlspecialchars($row['naziv_hr'], ENT_QUOTES) ?></span></h2>

  <div class="current-logo">
    <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_medium'], ENT_QUOTES) ?>" alt="" style="width:240px;height:160px;object-fit:cover">
    <span class="hint"><?= (int) $row['slika_width'] ?>×<?= (int) $row['slika_height'] ?>. Za zamjenu slike obrišite ovu i uploadajte novu.</span>
  </div>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>
    <label>Alt tekst / opis
      <input type="text" name="alt" value="<?= $v('alt') ?>">
    </label>
    <label>Redoslijed prikaza
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>
    <button type="submit" class="btn btn-primary">Spremi izmjene</button>
  </form>
<?php hnkcms_admin_page_end(); ?>
