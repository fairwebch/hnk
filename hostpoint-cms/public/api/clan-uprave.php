<?php
/**
 * GET /api/clan-uprave.php          → lista svih objavljenih članova uprave
 * GET /api/clan-uprave.php?id=5     → jedan član (samo ako je objavljen)
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'
 * — nacrti (Entwurf) se nikad ne izlažu ovdje, vidljivi su samo u adminu.
 * JSON oblik prati Sanity "clanUprave" tip (name/role/zaduzenje/phone/image/
 * order) tako da frontend swap zahtijeva minimalnu izmjenu (vidi sponzori.php).
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
$uploadsUrl = $baseUrl . '/uploads/clan-uprave';

function hnkcms_slika_json(array $row, string $uploadsUrl): ?array
{
    if (empty($row['slika_small'])) {
        return null;
    }
    return [
        'small' => $uploadsUrl . '/' . $row['slika_small'],
        'medium' => $uploadsUrl . '/' . $row['slika_medium'],
        'large' => $uploadsUrl . '/' . $row['slika_large'],
        'isVector' => (bool) $row['slika_is_vector'],
        'width' => $row['slika_width'] !== null ? (int) $row['slika_width'] : null,
        'height' => $row['slika_height'] !== null ? (int) $row['slika_height'] : null,
    ];
}

function hnkcms_clan_json(array $row, string $uploadsUrl): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['ime'],
        'role' => [
            'hr' => $row['funkcija_hr'],
            'de' => $row['funkcija_de'] ?: null,
        ],
        'zaduzenje' => ($row['zaduzenje_hr'] || $row['zaduzenje_de']) ? [
            'hr' => $row['zaduzenje_hr'] ?: null,
            'de' => $row['zaduzenje_de'] ?: null,
        ] : null,
        'phone' => $row['telefon'] ?: null,
        'image' => hnkcms_slika_json($row, $uploadsUrl),
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
    $stmt = $db->prepare("SELECT * FROM clan_uprave WHERE id = ? AND status = 'veroeffentlicht'");
    $stmt->execute([(int) $_GET['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_clan_json($row, $uploadsUrl), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$rows = $db->query(
    "SELECT * FROM clan_uprave WHERE status = 'veroeffentlicht' ORDER BY redoslijed ASC, id ASC"
)->fetchAll();

$members = array_map(fn($row) => hnkcms_clan_json($row, $uploadsUrl), $rows);

echo json_encode(['members' => $members], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
