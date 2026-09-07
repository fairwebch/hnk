<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/stranice.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT id FROM stranice WHERE id = ?');
$stmt->execute([$id]);

if ($stmt->fetch()) {
    $db->prepare('DELETE FROM stranice WHERE id = ?')->execute([$id]);
    header('Location: /admin/stranice.php?msg=' . rawurlencode('Stranica obrisana.'));
} else {
    header('Location: /admin/stranice.php');
}
