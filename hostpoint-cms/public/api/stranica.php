<?php
/**
 * GET /api/stranica.php               → lista svih objavljenih stranica
 * GET /api/stranica.php?slug=impressum → jedna stranica po slug-u (samo ako je objavljena)
 * GET /api/stranica.php?id=5           → jedna stranica po ID-u (samo ako je objavljena)
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'
 * — nacrti (Entwurf) se nikad ne izlažu ovdje, vidljivi su samo u adminu.
 * `body` je Markdown izvor pretvoren u HTML (vidi includes/markdown.php) —
 * frontend ga prikazuje direktno (dangerouslySetInnerHTML), nema Portable
 * Text parsiranja na Next.js strani.
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

function hnkcms_stranica_json(array $row): array
{
    $introHr = $row['uvod_hr'] ?: null;
    $introDe = $row['uvod_de'] ?: null;

    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title' => [
            'hr' => $row['naslov_hr'],
            'de' => $row['naslov_de'] ?: null,
        ],
        'intro' => ($introHr || $introDe) ? ['hr' => $introHr, 'de' => $introDe] : null,
        'body' => [
            'hr' => hnkcms_markdown_to_html($row['sadrzaj_hr']) ?: null,
            'de' => hnkcms_markdown_to_html($row['sadrzaj_de']) ?: null,
        ],
    ];
}

$db = hnkcms_db();

if (isset($_GET['slug'])) {
    $slug = (string) $_GET['slug'];
    $stmt = $db->prepare("SELECT * FROM stranice WHERE slug = ? AND status = 'veroeffentlicht'");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_stranica_json($row), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (isset($_GET['id'])) {
    if (!ctype_digit((string) $_GET['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_id']);
        exit;
    }
    $stmt = $db->prepare("SELECT * FROM stranice WHERE id = ? AND status = 'veroeffentlicht'");
    $stmt->execute([(int) $_GET['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_stranica_json($row), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$rows = $db->query(
    "SELECT * FROM stranice WHERE status = 'veroeffentlicht' ORDER BY naslov_hr ASC"
)->fetchAll();

$pages = array_map('hnkcms_stranica_json', $rows);

echo json_encode(['pages' => $pages], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
