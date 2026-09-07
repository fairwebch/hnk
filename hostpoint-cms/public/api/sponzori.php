<?php
/**
 * GET /api/sponzori.php          → lista svih objavljenih sponzora
 * GET /api/sponzori.php?id=5     → jedan sponzor (samo ako je objavljen)
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'
 * — nacrti (Entwurf) se nikad ne izlažu ovdje, vidljivi su samo u adminu.
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';

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

$baseUrl = rtrim(hnkcms_config()['public_base_url'], '/');
$uploadsUrl = $baseUrl . '/uploads/sponzori';

function hnkcms_logo_json(array $row, string $uploadsUrl): ?array
{
    if (empty($row['logo_small'])) {
        return null;
    }
    return [
        'small' => $uploadsUrl . '/' . $row['logo_small'],
        'medium' => $uploadsUrl . '/' . $row['logo_medium'],
        'large' => $uploadsUrl . '/' . $row['logo_large'],
        'isVector' => (bool) $row['logo_is_vector'],
        'width' => $row['logo_width'] !== null ? (int) $row['logo_width'] : null,
        'height' => $row['logo_height'] !== null ? (int) $row['logo_height'] : null,
    ];
}

function hnkcms_sponsor_json(array $row, string $uploadsUrl): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['naziv'],
        'logo' => hnkcms_logo_json($row, $uploadsUrl),
        'package' => $row['paket'],
        'link' => $row['link'] ?: null,
        'packageDescription' => [
            'hr' => $row['opis_paketa_hr'] ?: null,
            'de' => $row['opis_paketa_de'] ?: null,
        ],
        'order' => (int) $row['redoslijed'],
    ];
}

$db = hnkcms_db();

if (isset($_GET['id'])) {
    if (!ctype_digit((string) $_GET['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'invalid_id']);
        exit;
    }
    $stmt = $db->prepare("SELECT * FROM sponzori WHERE id = ? AND status = 'veroeffentlicht'");
    $stmt->execute([(int) $_GET['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_sponsor_json($row, $uploadsUrl), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$rows = $db->query(
    "SELECT * FROM sponzori WHERE status = 'veroeffentlicht' ORDER BY redoslijed ASC, id ASC"
)->fetchAll();

$sponsors = array_map(fn($row) => hnkcms_sponsor_json($row, $uploadsUrl), $rows);

echo json_encode(['sponsors' => $sponsors], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
