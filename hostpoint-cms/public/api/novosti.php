<?php
/**
 * GET /api/novosti.php              → sve objavljene novosti, datum DESC, BEZ body-ja
 *                                     (kao allNovostiQuery; paginacija ostaje klijentska u NewsList)
 * GET /api/novosti.php?limit=5      → najnovije (kao latestNovostiQuery za početnu), BEZ body-ja
 * GET /api/novosti.php?slug=...     → jedna novost s body-jem (Markdown -> HTML) i slikama u tekstu
 * GET /api/novosti.php?id=3         → isto po ID-u
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'.
 * `category` je sirova Sanity vrijednost (Eventi/Novosti/Skupština/Sport) —
 * HR/DE labele su u Next.js messages/*.json. `date` je ISO 8601 (UTC).
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';
require __DIR__ . '/../admin/includes/markdown.php';
require __DIR__ . '/../admin/includes/api-image.php';
require __DIR__ . '/../admin/includes/api-novost.php';

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

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/novosti';
$db = hnkcms_db();

if (isset($_GET['slug']) || isset($_GET['id'])) {
    if (isset($_GET['slug'])) {
        $stmt = $db->prepare("SELECT * FROM novosti WHERE slug = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(string) $_GET['slug']]);
    } else {
        if (!ctype_digit((string) $_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid_id']);
            exit;
        }
        $stmt = $db->prepare("SELECT * FROM novosti WHERE id = ? AND status = 'veroeffentlicht'");
        $stmt->execute([(int) $_GET['id']]);
    }
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_novost_full_json($db, $row, $uploadsUrl), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$sql = "SELECT * FROM novosti WHERE status = 'veroeffentlicht' ORDER BY datum DESC, id DESC";
if (isset($_GET['limit'])) {
    $limit = ctype_digit((string) $_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 5;
    $sql .= ' LIMIT ' . $limit;
}
$rows = $db->query($sql)->fetchAll();

$news = array_map(fn($row) => hnkcms_novost_summary_json($row, $uploadsUrl), $rows);
echo json_encode(['news' => $news], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
