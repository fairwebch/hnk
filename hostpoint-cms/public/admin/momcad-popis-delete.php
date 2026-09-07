<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/momcadi.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT momcad_id FROM momcad_popis_imena WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    $db->prepare('DELETE FROM momcad_popis_imena WHERE id = ?')->execute([$id]);
    header('Location: /admin/momcad-sastav.php?momcad=' . (int) $row['momcad_id'] . '&msg=' . rawurlencode('Red imena obrisan.'));
} else {
    header('Location: /admin/momcadi.php');
}
