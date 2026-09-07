<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/galerije.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT * FROM galerije WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    $uploadsDir = __DIR__ . '/../uploads/galerije';
    // Datoteke prije nego FK ON DELETE CASCADE obriše retke.
    $slike = $db->prepare('SELECT * FROM galerija_slike WHERE galerija_id = ?');
    $slike->execute([$id]);
    foreach ($slike->fetchAll() as $s) {
        WebpPipeline::delete($uploadsDir, $s, 'slika');
    }
    $db->prepare('DELETE FROM galerije WHERE id = ?')->execute([$id]);
    header('Location: /admin/galerije.php?msg=' . rawurlencode('Galerija obrisana.'));
} else {
    header('Location: /admin/galerije.php');
}
