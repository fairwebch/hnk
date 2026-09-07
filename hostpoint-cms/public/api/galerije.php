<?php
/**
 * GET /api/galerije.php                 → sve objavljene galerije, lagani oblik (kao allGalerijeQuery:
 *                                          name, slug, kategorija, godina, date, cover, count) —
 *                                          godina DESC, datum DESC; bez paginacije, kao i danas
 * GET /api/galerije.php?limit=4         → najnovije po datumu (kao galerijeTeaserQuery za početnu)
 * GET /api/galerije.php?slug=film-diva  → jedna galerija, puni oblik (kao galerijaBySlugQuery:
 *                                          + description, images[] sa thumb/small/medium/large/alt)
 * GET /api/galerije.php?id=3            → isto po ID-u
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'.
 * `cover` = prva slika po redoslijedu (Sanity images[0]). `kategorija` je sirova
 * vrijednost (sport/feste) — HR/DE labele su u Next.js messages/*.json.
 * `thumb` (600x600 crop) je namijenjen gridu — isto što je produkcija dobivala
 * od Sanity CDN-a kao 600x600 fit=crop.
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

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/galerije';
$db = hnkcms_db();

function hnkcms_galerija_base_json(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'name' => ['hr' => $row['naziv_hr'], 'de' => $row['naziv_de'] ?: null],
        'kategorija' => $row['kategorija'],
        'godina' => (int) $row['godina'],
        'date' => $row['datum'],
    ];
}

/** Lista: jedan upit za galerije (+ count i id cover slike), jedan za sve cover retke. */
function hnkcms_galerije_list_json(PDO $db, string $uploadsUrl, string $orderBy, ?int $limit): array
{
    $sql = "SELECT g.*,
              (SELECT COUNT(*) FROM galerija_slike s WHERE s.galerija_id = g.id) AS cnt,
              (SELECT s.id FROM galerija_slike s WHERE s.galerija_id = g.id ORDER BY s.redoslijed ASC, s.id ASC LIMIT 1) AS cover_id
            FROM galerije g
            WHERE g.status = 'veroeffentlicht'
            ORDER BY {$orderBy}";
    if ($limit !== null) {
        $sql .= ' LIMIT ' . (int) $limit;
    }
    $rows = $db->query($sql)->fetchAll();

    $coverIds = array_values(array_filter(array_map(fn($r) => $r['cover_id'], $rows)));
    $covers = [];
    if ($coverIds) {
        $in = implode(',', array_fill(0, count($coverIds), '?'));
        $stmt = $db->prepare("SELECT * FROM galerija_slike WHERE id IN ({$in})");
        $stmt->execute($coverIds);
        foreach ($stmt->fetchAll() as $c) {
            $covers[(int) $c['id']] = $c;
        }
    }

    return array_map(function ($r) use ($covers, $uploadsUrl) {
        $cover = $r['cover_id'] !== null ? ($covers[(int) $r['cover_id']] ?? null) : null;
        return hnkcms_galerija_base_json($r) + [
            'cover' => $cover ? hnkcms_image_json($cover, 'slika', $uploadsUrl, 'alt') : null,
            'count' => (int) $r['cnt'],
        ];
    }, $rows);
}

if (isset($_GET['slug']) || isset($_GET['id'])) {
    if (isset($_GET['slug'])) {
        $stmt = $db->prepare("SELECT * FROM galerije WHERE slug = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(string) $_GET['slug']]);
    } else {
        if (!ctype_digit((string) $_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid_id']);
            exit;
        }
        $stmt = $db->prepare("SELECT * FROM galerije WHERE id = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(int) $_GET['id']]);
    }
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }

    $imgs = $db->prepare('SELECT * FROM galerija_slike WHERE galerija_id = ? ORDER BY redoslijed ASC, id ASC');
    $imgs->execute([(int) $row['id']]);
    $images = [];
    foreach ($imgs->fetchAll() as $s) {
        $img = hnkcms_image_json($s, 'slika', $uploadsUrl, 'alt');
        if ($img !== null) {
            $img['id'] = (int) $s['id'];
            $images[] = $img;
        }
    }

    $json = hnkcms_galerija_base_json($row) + [
        'description' => hnkcms_locale_json($row, 'opis'),
        'count' => count($images),
        'images' => $images,
    ];
    echo json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (isset($_GET['limit'])) {
    $limit = ctype_digit((string) $_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 4;
    $teaser = hnkcms_galerije_list_json($db, $uploadsUrl, 'g.datum DESC, g.godina DESC, g.id DESC', $limit);
    echo json_encode(['galleries' => $teaser], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$all = hnkcms_galerije_list_json($db, $uploadsUrl, 'g.godina DESC, g.datum DESC, g.id ASC', null);
echo json_encode(['galleries' => $all], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
