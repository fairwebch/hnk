<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/momcadi.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT * FROM momcadi WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    $uploadsDir = __DIR__ . '/../uploads/momcadi';

    // Datoteke child redaka prije nego ih FK ON DELETE CASCADE obriše iz baze.
    foreach (['momcad_igraci', 'momcad_galerija'] as $table) {
        $children = $db->prepare("SELECT * FROM {$table} WHERE momcad_id = ?");
        $children->execute([$id]);
        foreach ($children->fetchAll() as $child) {
            WebpPipeline::delete($uploadsDir, $child, 'slika');
        }
    }
    foreach (['cover', 'grupna', 'trener_slika'] as $prefix) {
        WebpPipeline::delete($uploadsDir, $row, $prefix);
    }

    $db->prepare('DELETE FROM momcadi WHERE id = ?')->execute([$id]);
    header('Location: /admin/momcadi.php?msg=' . rawurlencode('Momčad obrisana.'));
} else {
    header('Location: /admin/momcadi.php');
}
