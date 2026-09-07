<?php
/**
 * POST: dodaje jednu ili više slika u galeriju (input name="slike[]").
 * Isti obrazac kao momcad-galerija-upload.php, plus THUMB_SIZE kvadratni crop.
 */
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

$db = hnkcms_db();
$galId = (int) ($_POST['galerija'] ?? 0);
$galStmt = $db->prepare('SELECT id FROM galerije WHERE id = ?');
$galStmt->execute([$galId]);
if (!$galStmt->fetch()) {
    header('Location: /admin/galerije.php');
    exit;
}
$back = '/admin/galerija-slike.php?galerija=' . $galId;

$files = $_FILES['slike'] ?? null;
if (!$files || !is_array($files['name'])) {
    header('Location: ' . $back . '&msg=' . rawurlencode('Nijedna datoteka nije odabrana (ili je upload prekoračio ' . ini_get('post_max_size') . ').'));
    exit;
}

$uploadsDir = __DIR__ . '/../uploads/galerije';
$nextOrder = (int) $db->query("SELECT COALESCE(MAX(redoslijed), 0) FROM galerija_slike WHERE galerija_id = {$galId}")->fetchColumn();

$ok = 0;
$failed = [];
foreach ($files['name'] as $i => $name) {
    if ($name === '' || $name === null) {
        continue;
    }
    $file = [
        'name' => $name,
        'type' => $files['type'][$i],
        'tmp_name' => $files['tmp_name'][$i],
        'error' => $files['error'][$i],
        'size' => $files['size'][$i],
    ];

    $nextOrder += 10;
    $db->prepare('INSERT INTO galerija_slike (galerija_id, redoslijed) VALUES (?, ?)')->execute([$galId, $nextOrder]);
    $newId = (int) $db->lastInsertId();

    try {
        $d = WebpPipeline::process($file, $uploadsDir, $newId, 'galerija', WebpPipeline::WIDTHS_WIDE, WebpPipeline::THUMB_SIZE);
        $db->prepare('UPDATE galerija_slike SET slika_original=?, slika_thumb=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
            ->execute([$d['original'], $d['thumb'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $newId]);
        $ok++;
    } catch (LogoUploadError $e) {
        $db->prepare('DELETE FROM galerija_slike WHERE id = ?')->execute([$newId]);
        $nextOrder -= 10;
        $failed[] = $name . ' (' . $e->getMessage() . ')';
    }
}

$msg = "Dodano slika: {$ok}.";
if ($failed) {
    $msg .= ' Neuspjelo: ' . implode('; ', $failed);
}
header('Location: ' . $back . '&msg=' . rawurlencode($msg));
