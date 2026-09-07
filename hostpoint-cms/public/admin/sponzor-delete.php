<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/index.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT * FROM sponzori WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    WebpPipeline::delete(__DIR__ . '/../uploads/sponzori', $row);
    $db->prepare('DELETE FROM sponzori WHERE id = ?')->execute([$id]);
    header('Location: /admin/index.php?msg=' . rawurlencode('Sponzor obrisan.'));
} else {
    header('Location: /admin/index.php');
}
