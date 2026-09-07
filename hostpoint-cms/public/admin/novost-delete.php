<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/novosti.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT * FROM novosti WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    $uploadsDir = __DIR__ . '/../uploads/novosti';
    $slike = $db->prepare('SELECT * FROM novost_slike WHERE novost_id = ?');
    $slike->execute([$id]);
    foreach ($slike->fetchAll() as $s) {
        WebpPipeline::delete($uploadsDir, $s, 'slika');
    }
    WebpPipeline::delete($uploadsDir, $row, 'cover');
    $db->prepare('DELETE FROM novosti WHERE id = ?')->execute([$id]);
    header('Location: /admin/novosti.php?msg=' . rawurlencode('Novost obrisana.'));
} else {
    header('Location: /admin/novosti.php');
}
