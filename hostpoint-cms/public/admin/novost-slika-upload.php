<?php
/**
 * POST: dodaje jednu ili više slika u tekst novosti (novost_slike). Admin
 * zatim kopira `![alt](url)` snippet u Markdown — isti obrazac kao
 * galerija-slike-upload.php, širine WIDTHS_WIDE (medium 1200px = PortableText).
 */
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

$db = hnkcms_db();
$novostId = (int) ($_POST['novost'] ?? 0);
$chk = $db->prepare('SELECT id FROM novosti WHERE id = ?');
$chk->execute([$novostId]);
if (!$chk->fetch()) {
    header('Location: /admin/novosti.php');
    exit;
}
$back = '/admin/novost-edit.php?id=' . $novostId;

$files = $_FILES['slike'] ?? null;
if (!$files || !is_array($files['name'])) {
    header('Location: ' . $back . '&msg=' . rawurlencode('Nijedna datoteka nije odabrana (ili je upload prekoračio ' . ini_get('post_max_size') . ').'));
    exit;
}

$uploadsDir = __DIR__ . '/../uploads/novosti';
$nextOrder = (int) $db->query("SELECT COALESCE(MAX(redoslijed), 0) FROM novost_slike WHERE novost_id = {$novostId}")->fetchColumn();

$ok = 0;
$failed = [];
foreach ($files['name'] as $i => $name) {
    if ($name === '' || $name === null) {
        continue;
    }
    $file = ['name' => $name, 'type' => $files['type'][$i], 'tmp_name' => $files['tmp_name'][$i], 'error' => $files['error'][$i], 'size' => $files['size'][$i]];

    $nextOrder += 10;
    $db->prepare('INSERT INTO novost_slike (novost_id, redoslijed, alt) VALUES (?, ?, ?)')->execute([$novostId, $nextOrder, pathinfo($name, PATHINFO_FILENAME)]);
    $newId = (int) $db->lastInsertId();

    try {
        $d = WebpPipeline::process($file, $uploadsDir, $newId, 'slika', WebpPipeline::WIDTHS_WIDE);
        $db->prepare('UPDATE novost_slike SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
            ->execute([$d['original'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $newId]);
        $ok++;
    } catch (LogoUploadError $e) {
        $db->prepare('DELETE FROM novost_slike WHERE id = ?')->execute([$newId]);
        $nextOrder -= 10;
        $failed[] = $name . ' (' . $e->getMessage() . ')';
    }
}

$msg = "Dodano slika: {$ok}. Kopirajte snippet u Sadržaj.";
if ($failed) {
    $msg .= ' Neuspjelo: ' . implode('; ', $failed);
}
header('Location: ' . $back . '&msg=' . rawurlencode($msg));
