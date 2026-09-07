<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : 0;
$stmt = $db->prepare('SELECT s.*, n.naslov_hr FROM novost_slike s JOIN novosti n ON n.id = s.novost_id WHERE s.id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();
if (!$row) {
    header('Location: /admin/novosti.php');
    exit;
}
$back = '/admin/novost-edit.php?id=' . (int) $row['novost_id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $alt = trim((string) ($_POST['alt'] ?? ''));
    $db->prepare('UPDATE novost_slike SET alt=? WHERE id=?')->execute([$alt ?: null, $id]);
    header('Location: ' . $back . '&msg=' . rawurlencode('Alt tekst spremljen — ažurirajte snippet u tekstu ako je već umetnut.'));
    exit;
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/novosti';
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start('Slika u tekstu · ' . $row['naslov_hr'], 'novosti', $user, true);
?>
  <p><a href="<?= $back ?>">&larr; Natrag na novost</a></p>
  <h2>Alt tekst slike <span class="hint" style="display:inline;font-weight:400">— <?= htmlspecialchars($row['naslov_hr'], ENT_QUOTES) ?></span></h2>

  <div class="current-logo">
    <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_medium'], ENT_QUOTES) ?>" alt="" style="width:240px;height:auto;max-height:240px;object-fit:contain">
    <span class="hint"><?= (int) $row['slika_width'] ?>×<?= (int) $row['slika_height'] ?></span>
  </div>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>
    <label>Alt tekst / potpis pod slikom
      <input type="text" name="alt" value="<?= $v('alt') ?>">
    </label>
    <button type="submit" class="btn btn-primary">Spremi</button>
  </form>
<?php hnkcms_admin_page_end(); ?>
