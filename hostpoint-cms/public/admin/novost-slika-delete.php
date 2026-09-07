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
$stmt = $db->prepare('SELECT * FROM novost_slike WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    WebpPipeline::delete(__DIR__ . '/../uploads/novosti', $row, 'slika');
    $db->prepare('DELETE FROM novost_slike WHERE id = ?')->execute([$id]);
    header('Location: /admin/novost-edit.php?id=' . (int) $row['novost_id'] . '&msg=' . rawurlencode('Slika obrisana.'));
} else {
    header('Location: /admin/novosti.php');
}
