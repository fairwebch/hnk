<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/klub.php');
    exit;
}
hnkcms_verify_csrf();

$db = hnkcms_db();
$id = (int) ($_POST['id'] ?? 0);
$stmt = $db->prepare('SELECT * FROM klub_timeline WHERE id = ?');
$stmt->execute([$id]);
if ($row = $stmt->fetch()) {
    $db->prepare('DELETE FROM klub_timeline WHERE id = ?')->execute([$id]);
    WebpPipeline::delete(__DIR__ . '/../uploads/klub', $row, 'slika');
}
header('Location: /admin/klub.php?msg=' . rawurlencode('Stavka obrisana.'));
