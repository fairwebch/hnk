<?php
/**
 * GET /api/dogadjaji.php              → { upcoming: [...], past: [...] } — nadolazeći (datum_pocetak ASC)
 *                                       i prošli (DESC), kao upcomingDogadjajiQuery / pastDogadjajiQuery;
 *                                       "sada" se računa na serveru u UTC nad COALESCE(datum_kraj, datum_pocetak)
 * GET /api/dogadjaji.php?next=1       → prvi nadolazeći ili null (kao nextDogadjajQuery, za početnu)
 * GET /api/dogadjaji.php?slug=...     → jedan događaj (kao dogadjajBySlugQuery)
 * GET /api/dogadjaji.php?id=3         → isto po ID-u
 *
 * Javni, read-only, bez autentikacije. Vraća samo status='veroeffentlicht'.
 * SIGURNOST: `tajni_kod` se NIKAD ne serializira (validira ga isključivo
 * prijavni endpoint), a ovaj endpoint se uopće ne spaja na privatnu bazu
 * prijava — ne vraća ni brojeve prijava. Postavke prijava (vrstaPrijave,
 * pristupPrijavi, prijaveOtvorene, rokPrijave) su javne kao i u Sanityju
 * (frontend po njima odlučuje prikazuje li formu).
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/cors.php';
require __DIR__ . '/../admin/includes/markdown.php';
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

$baseUrl = rtrim(hnkcms_config()['public_base_url'], '/');
$uploadsUrl = $baseUrl . '/uploads/dogadjaji';
$sponzoriUrl = $baseUrl . '/uploads/sponzori';
$db = hnkcms_db();

/** MySQL DATETIME (UTC) -> ISO 8601, kakav Sanity vraća za `datetime`. */
function hnkcms_dt(?string $mysql): ?string
{
    return $mysql === null ? null : str_replace(' ', 'T', $mysql) . 'Z';
}

// Jedan SELECT za sve: sponzor i galerija se pridružuju odmah (LEFT JOIN),
// program se dohvaća po događaju (max nekoliko stavki).
const HNKCMS_DOGADJAJ_SELECT = "
    SELECT d.*,
           s.naziv AS sp_naziv, s.link AS sp_link,
           s.logo_small AS sp_logo_small, s.logo_medium AS sp_logo_medium, s.logo_large AS sp_logo_large,
           s.logo_is_vector AS sp_logo_is_vector, s.logo_width AS sp_logo_width, s.logo_height AS sp_logo_height,
           g.slug AS gal_slug, g.naziv_hr AS gal_naziv_hr, g.naziv_de AS gal_naziv_de, g.status AS gal_status
    FROM dogadjaji d
    LEFT JOIN sponzori s ON s.id = d.sponzor_id AND s.status = 'veroeffentlicht'
    LEFT JOIN galerije g ON g.id = d.galerija_id
";

function hnkcms_dogadjaj_json(PDO $db, array $r, string $uploadsUrl, string $sponzoriUrl): array
{
    $program = $db->prepare('SELECT vrijeme, opis FROM dogadjaj_program WHERE dogadjaj_id = ? ORDER BY redoslijed ASC, id ASC');
    $program->execute([(int) $r['id']]);

    $sponzor = null;
    if ($r['sp_naziv'] !== null) {
        $sponzor = [
            'name' => $r['sp_naziv'],
            'logo' => hnkcms_image_json($r, 'sp_logo', $sponzoriUrl),
            'link' => $r['sp_link'] ?: null,
        ];
    }
    $galerija = null;
    if ($r['gal_slug'] !== null && $r['gal_status'] === 'veroeffentlicht') {
        $galerija = ['name' => ['hr' => $r['gal_naziv_hr'], 'de' => $r['gal_naziv_de'] ?: null], 'slug' => $r['gal_slug']];
    }

    return [
        'id' => (int) $r['id'],
        'slug' => $r['slug'],
        'name' => ['hr' => $r['naziv_hr'], 'de' => $r['naziv_de'] ?: null],
        'kategorija' => $r['kategorija'],
        'datumPocetak' => hnkcms_dt($r['datum_pocetak']),
        'datumKraj' => hnkcms_dt($r['datum_kraj']),
        'location' => $r['lokacija'] ?: null,
        'coverImage' => hnkcms_image_json($r, 'cover', $uploadsUrl, 'cover_alt'),
        'description' => [
            'hr' => hnkcms_markdown_to_html($r['opis_hr']) ?: null,
            'de' => hnkcms_markdown_to_html($r['opis_de']) ?: null,
        ],
        'kotizacija' => $r['kotizacija'] ?: null,
        'prijavaLink' => $r['prijava_link'] ?: null,
        'kapacitet' => $r['kapacitet'] ?: null,
        'program' => array_map(fn($p) => ['vrijeme' => $p['vrijeme'] ?: null, 'opis' => $p['opis'] ?: null], $program->fetchAll()),
        'vrstaPrijave' => $r['vrsta_prijave'],
        'pristupPrijavi' => $r['pristup_prijavi'],
        'prijaveOtvorene' => (bool) $r['prijave_otvorene'],
        'rokPrijave' => hnkcms_dt($r['rok_prijave']),
        'sponzorEventa' => $sponzor,
        'galerija' => $galerija,
        // NAMJERNO bez tajni_kod.
    ];
}

if (isset($_GET['slug']) || isset($_GET['id'])) {
    if (isset($_GET['slug'])) {
        $stmt = $db->prepare(HNKCMS_DOGADJAJ_SELECT . " WHERE d.slug = ? AND d.status = 'veroeffentlicht'");
        $stmt->execute([(string) $_GET['slug']]);
    } else {
        if (!ctype_digit((string) $_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid_id']);
            exit;
        }
        $stmt = $db->prepare(HNKCMS_DOGADJAJ_SELECT . " WHERE d.id = ? AND d.status = 'veroeffentlicht'");
        $stmt->execute([(int) $_GET['id']]);
    }
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'not_found']);
        exit;
    }
    echo json_encode(hnkcms_dogadjaj_json($db, $row, $uploadsUrl, $sponzoriUrl), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$upcomingSql = HNKCMS_DOGADJAJ_SELECT . " WHERE d.status = 'veroeffentlicht' AND COALESCE(d.datum_kraj, d.datum_pocetak) >= UTC_TIMESTAMP() ORDER BY d.datum_pocetak ASC, d.id ASC";

if (isset($_GET['next'])) {
    $row = $db->query($upcomingSql . ' LIMIT 1')->fetch();
    echo json_encode($row ? hnkcms_dogadjaj_json($db, $row, $uploadsUrl, $sponzoriUrl) : null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$upcoming = array_map(fn($r) => hnkcms_dogadjaj_json($db, $r, $uploadsUrl, $sponzoriUrl), $db->query($upcomingSql)->fetchAll());
$past = array_map(
    fn($r) => hnkcms_dogadjaj_json($db, $r, $uploadsUrl, $sponzoriUrl),
    $db->query(HNKCMS_DOGADJAJ_SELECT . " WHERE d.status = 'veroeffentlicht' AND COALESCE(d.datum_kraj, d.datum_pocetak) < UTC_TIMESTAMP() ORDER BY d.datum_pocetak DESC, d.id DESC")->fetchAll()
);

echo json_encode(['upcoming' => $upcoming, 'past' => $past], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
