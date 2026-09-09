<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/dogadjaji.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$db = hnkcms_db();
$stmt = $db->prepare('SELECT * FROM dogadjaji WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();

if ($row) {
    $uploadsDir = __DIR__ . '/../uploads/dogadjaji';
    WebpPipeline::delete($uploadsDir, $row, 'cover');
    WebpPipeline::delete($uploadsDir, $row, 'flyer');
    $customSponsors = $db->prepare('SELECT * FROM dogadjaj_sponzori_custom WHERE dogadjaj_id = ?');
    $customSponsors->execute([$id]);
    foreach ($customSponsors->fetchAll() as $cs) {
        WebpPipeline::delete($uploadsDir, $cs, 'logo');
    }
    // Program i sponzori (opći/event-only) se brišu FK cascade-om. Prijave su
    // u drugoj bazi — ostaju do isteka retencije (bin/purge-prijave.php),
    // namjerno se ne diraju odavde.
    $db->prepare('DELETE FROM dogadjaji WHERE id = ?')->execute([$id]);
    header('Location: /admin/dogadjaji.php?msg=' . rawurlencode('Događaj obrisan.'));
} else {
    header('Location: /admin/dogadjaji.php');
}
