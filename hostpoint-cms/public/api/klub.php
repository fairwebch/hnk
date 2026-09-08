<?php
/**
 * GET /api/klub.php → { uvod: {hr,de}|null (HTML), zavrsni: {hr,de}|null (HTML),
 *                       timeline: [{ id, godina, godinaLabela, naslov, tekst, slika }] }
 * Zamjena za Sanity klubStranica (klubStranicaQuery). Markdown → HTML na
 * serveru kao kod stranica/novosti; timeline tekst ostaje običan tekst
 * (frontend čuva nove redove kao i za Sanity localeText).
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';
require __DIR__ . '/../admin/includes/api-image.php';
require __DIR__ . '/../admin/includes/markdown.php';

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

$db = hnkcms_db();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/klub';

$s = $db->query('SELECT * FROM klub_stranica WHERE id = 1')->fetch() ?: [];
$md = fn(?string $v) => $v !== null && trim($v) !== '' ? hnkcms_markdown_to_html($v) : null;
$loc = function (string $prefix) use ($s, $md): ?array {
    $hr = $md($s["{$prefix}_hr"] ?? null);
    $de = $md($s["{$prefix}_de"] ?? null);
    return ($hr || $de) ? ['hr' => $hr, 'de' => $de] : null;
};

$timeline = array_map(fn($r) => [
    'id' => (int) $r['id'],
    'godina' => (int) $r['godina'],
    'godinaLabela' => hnkcms_locale_json($r, 'godina_labela'),
    'naslov' => hnkcms_locale_json($r, 'naslov'),
    'tekst' => hnkcms_locale_json($r, 'tekst'),
    'slika' => hnkcms_image_json($r, 'slika', $uploadsUrl, 'slika_alt'),
], $db->query('SELECT * FROM klub_timeline ORDER BY godina ASC, redoslijed ASC, id ASC')->fetchAll());

echo json_encode(['uvod' => $loc('uvod'), 'zavrsni' => $loc('zavrsni'), 'timeline' => $timeline], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
