<?php
/**
 * GET /api/sajt.php → { heroSlike: CmsImg[], headerKlub: CmsImg|null,
 *                       headerSponzoring: CmsImg|null, headerPostaniClan: CmsImg|null }
 * Zamjena za Sanity postavkeSajta (postavkeSajtaQuery + pageHeaderSlikeQuery).
 * Javni, read-only.
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';
require __DIR__ . '/../admin/includes/api-image.php';

header('Content-Type: application/json; charset=utf-8');
hnkcms_apply_public_cors();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/sajt';
$rows = hnkcms_db()->query('SELECT * FROM slike_sajta ORDER BY kljuc, redoslijed ASC, id ASC')->fetchAll();

$out = ['heroSlike' => [], 'headerKlub' => null, 'headerSponzoring' => null, 'headerPostaniClan' => null];
$map = ['header_klub' => 'headerKlub', 'header_sponzoring' => 'headerSponzoring', 'header_postani_clan' => 'headerPostaniClan'];
foreach ($rows as $r) {
    $img = hnkcms_image_json($r, 'slika', $uploadsUrl, 'slika_alt');
    if ($r['kljuc'] === 'hero') {
        if (count($out['heroSlike']) < 3) {
            $out['heroSlike'][] = $img;
        }
    } elseif ($out[$map[$r['kljuc']]] === null) {
        $out[$map[$r['kljuc']]] = $img;
    }
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
