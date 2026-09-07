<?php
/**
 * GET /api/momcadi.php               → lista objavljenih momčadi, lagani oblik (kao Sanity allMomcadiQuery:
 *                                       name, slug, order, liga, coverImage, grupnaFotografija, popisImena, brojIgraca)
 * GET /api/momcadi.php?slug=aktivni  → jedna momčad, puni oblik (kao momcadBySlugQuery: + description kao HTML,
 *                                       terminTreninga, igraci[], trener, gallery[])
 * GET /api/momcadi.php?id=3          → isto po ID-u
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'.
 * Child tablice (igraci / popis_imena / galerija) se vraćaju ugniježđeno kao
 * u Sanityju, sortirane po redoslijed, id. `pozicija` ostaje sirova vrijednost
 * (golman/obrana/vezni/napad) — HR/DE labele su u Next.js messages/*.json, kao i danas.
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';
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

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';

/** Slika iz kolona {prefix}_small/medium/large/is_vector/width/height (+ {prefix}_alt), ili null. */
function hnkcms_image_json(array $row, string $prefix, string $uploadsUrl, bool $withAlt = false): ?array
{
    if (empty($row["{$prefix}_small"])) {
        return null;
    }
    $img = [
        'small' => $uploadsUrl . '/' . $row["{$prefix}_small"],
        'medium' => $uploadsUrl . '/' . $row["{$prefix}_medium"],
        'large' => $uploadsUrl . '/' . $row["{$prefix}_large"],
        'isVector' => (bool) $row["{$prefix}_is_vector"],
        'width' => $row["{$prefix}_width"] !== null ? (int) $row["{$prefix}_width"] : null,
        'height' => $row["{$prefix}_height"] !== null ? (int) $row["{$prefix}_height"] : null,
    ];
    if ($withAlt) {
        $img['alt'] = $row["{$prefix}_alt"] ?: null;
    }
    return $img;
}

/** {hr, de} iz kolona {prefix}_hr/{prefix}_de, ili null ako su obje prazne. */
function hnkcms_locale_json(array $row, string $prefix): ?array
{
    $hr = $row["{$prefix}_hr"] ?: null;
    $de = $row["{$prefix}_de"] ?: null;
    return ($hr || $de) ? ['hr' => $hr, 'de' => $de] : null;
}

function hnkcms_popis_json(PDO $db, int $momcadId): array
{
    $stmt = $db->prepare('SELECT * FROM momcad_popis_imena WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
    $stmt->execute([$momcadId]);
    return array_map(fn($r) => [
        'id' => (int) $r['id'],
        'oznakaReda' => hnkcms_locale_json($r, 'oznaka'),
        'imena' => $r['imena'],
    ], $stmt->fetchAll());
}

function hnkcms_momcad_summary_json(PDO $db, array $row, string $uploadsUrl): array
{
    $cnt = $db->prepare('SELECT COUNT(*) FROM momcad_igraci WHERE momcad_id = ?');
    $cnt->execute([$row['id']]);

    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'name' => ['hr' => $row['naziv_hr'], 'de' => $row['naziv_de'] ?: null],
        'order' => (int) $row['redoslijed'],
        'liga' => hnkcms_locale_json($row, 'liga'),
        'coverImage' => hnkcms_image_json($row, 'cover', $uploadsUrl, true),
        'grupnaFotografija' => hnkcms_image_json($row, 'grupna', $uploadsUrl, true),
        'popisImena' => hnkcms_popis_json($db, (int) $row['id']),
        'brojIgraca' => (int) $cnt->fetchColumn(),
    ];
}

function hnkcms_momcad_full_json(PDO $db, array $row, string $uploadsUrl): array
{
    $json = hnkcms_momcad_summary_json($db, $row, $uploadsUrl);
    $id = (int) $row['id'];

    $json['terminTreninga'] = hnkcms_locale_json($row, 'termin_treninga');
    $json['description'] = [
        'hr' => hnkcms_markdown_to_html($row['opis_hr']) ?: null,
        'de' => hnkcms_markdown_to_html($row['opis_de']) ?: null,
    ];

    $igraci = $db->prepare('SELECT * FROM momcad_igraci WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
    $igraci->execute([$id]);
    $json['igraci'] = array_map(fn($p) => [
        'id' => (int) $p['id'],
        'ime' => $p['ime'],
        'prezime' => $p['prezime'] ?: null,
        'broj' => $p['broj'] !== null ? (int) $p['broj'] : null,
        'pozicija' => $p['pozicija'] ?: null,
        'slika' => hnkcms_image_json($p, 'slika', $uploadsUrl),
    ], $igraci->fetchAll());

    $json['trener'] = $row['trener_ime'] ? [
        'ime' => $row['trener_ime'],
        'funkcija' => hnkcms_locale_json($row, 'trener_funkcija'),
        'slika' => hnkcms_image_json($row, 'trener_slika', $uploadsUrl),
    ] : null;

    $gal = $db->prepare('SELECT * FROM momcad_galerija WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
    $gal->execute([$id]);
    $json['gallery'] = array_values(array_filter(array_map(function ($g) use ($uploadsUrl) {
        $img = hnkcms_image_json($g, 'slika', $uploadsUrl);
        if ($img === null) {
            return null;
        }
        $img['alt'] = $g['alt'] ?: null;
        $img['id'] = (int) $g['id'];
        return $img;
    }, $gal->fetchAll())));

    return $json;
}

$db = hnkcms_db();

if (isset($_GET['slug']) || isset($_GET['id'])) {
    if (isset($_GET['slug'])) {
        $stmt = $db->prepare("SELECT * FROM momcadi WHERE slug = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(string) $_GET['slug']]);
    } else {
        if (!ctype_digit((string) $_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid_id']);
            exit;
        }
        $stmt = $db->prepare("SELECT * FROM momcadi WHERE id = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(int) $_GET['id']]);
    }
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_momcad_full_json($db, $row, $uploadsUrl), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$rows = $db->query(
    "SELECT * FROM momcadi WHERE status = 'veroeffentlicht' ORDER BY redoslijed ASC, id ASC"
)->fetchAll();

$teams = array_map(fn($row) => hnkcms_momcad_summary_json($db, $row, $uploadsUrl), $rows);

echo json_encode(['teams' => $teams], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
