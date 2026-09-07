<?php
/**
 * POST: dodaje jednu ili više slika u galeriju momčadi (input name="slike[]").
 * PHP kod multiple uploada obrne strukturu $_FILES (name[], tmp_name[], ...),
 * pa se ovdje presloži u jedan $_FILES-oblik po datoteci za WebpPipeline.
 */
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

$db = hnkcms_db();
$momcadId = (int) ($_POST['momcad'] ?? 0);
$teamStmt = $db->prepare('SELECT id FROM momcadi WHERE id = ?');
$teamStmt->execute([$momcadId]);
if (!$teamStmt->fetch()) {
    header('Location: /admin/momcadi.php');
    exit;
}
$back = '/admin/momcad-sastav.php?momcad=' . $momcadId;

$files = $_FILES['slike'] ?? null;
if (!$files || !is_array($files['name'])) {
    header('Location: ' . $back . '&msg=' . rawurlencode('Nijedna datoteka nije odabrana.'));
    exit;
}

$uploadsDir = __DIR__ . '/../uploads/momcadi';
$nextOrder = (int) $db->query("SELECT COALESCE(MAX(redoslijed), 0) FROM momcad_galerija WHERE momcad_id = {$momcadId}")->fetchColumn();

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
    $db->prepare('INSERT INTO momcad_galerija (momcad_id, redoslijed) VALUES (?, ?)')->execute([$momcadId, $nextOrder]);
    $newId = (int) $db->lastInsertId();

    try {
        $d = WebpPipeline::process($file, $uploadsDir, $newId, 'galerija', WebpPipeline::WIDTHS_WIDE);
        $db->prepare('UPDATE momcad_galerija SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
            ->execute([$d['original'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $newId]);
        $ok++;
    } catch (LogoUploadError $e) {
        // Prazan redak bez slike nema smisla — ukloni ga i zabilježi grešku.
        $db->prepare('DELETE FROM momcad_galerija WHERE id = ?')->execute([$newId]);
        $failed[] = $name . ' (' . $e->getMessage() . ')';
    }
}

$msg = "Dodano slika: {$ok}.";
if ($failed) {
    $msg .= ' Neuspjelo: ' . implode('; ', $failed);
}
header('Location: ' . $back . '&msg=' . rawurlencode($msg));
