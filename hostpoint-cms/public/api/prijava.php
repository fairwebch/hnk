<?php
/**
 * Prijave na događaje — JEDINI javni endpoint koji dira PRIVATNU bazu.
 *
 * GET  /api/prijava.php?slug=…&kod=…        → { valid: bool } (članski kod; kod se nikad ne vraća)
 * POST /api/prijava.php                     → JSON prijava (isti oblik kao Next /api/prijava):
 *      { type: osoba|ekipa, slug, kod?, locale?, company (honeypot), email, telefon?, privola: true,
 *        ime, prezime, brojOsoba?, napomena?  |  nazivEkipe, kontaktOsoba }
 *      → 200 {ok, id, emailOk} | 400 bad_request | 422 validation|wrong_type|consent_required
 *        | 404 not_found | 409 closed | 403 forbidden | 429 rate_limited | 502 store_failed
 * POST /api/prijava.php?action=otkazi { token } → 200 {ok, dogadjaj} | {ok, already:true, dogadjaj}
 *      | 404 not_found | 429 rate_limited
 *
 * Javni podaci događaja se čitaju iz javne baze (hnkcms_db), prijave se pišu
 * u privatnu (hnkcms_db_prijave). Otkazni token se čuva samo kao SHA-256
 * hash. Rate limit: hash(IP + dan) u privatnoj bazi, 5 prijava / 10 otkaza po
 * 10 min. Privola je obavezna (privola_at). E-mail preko includes/mail.php.
 */

declare(strict_types=1);

require __DIR__ . '/../admin/includes/db.php';
require __DIR__ . '/../admin/includes/db-prijave.php';
require __DIR__ . '/../admin/includes/cors.php';
require __DIR__ . '/../admin/includes/mail.php';

header('Content-Type: application/json; charset=utf-8');
hnkcms_apply_public_cors(true);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $code, array $body): never
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Klijentski IP: iza Next proxyja stiže u X-Forwarded-For, inače REMOTE_ADDR. */
function client_ip(): string
{
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    $ip = $xff !== '' ? trim(explode(',', $xff)[0]) : ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return $ip !== '' ? $ip : 'unknown';
}

/** Rate limit u privatnoj bazi; ključ = sha256(prefiks + IP + dan) — nema čitljivih IP-ova. */
function rate_limited(PDO $p, string $prefix, int $max, int $windowSec): bool
{
    $key = hash('sha256', $prefix . '|' . client_ip() . '|' . gmdate('Y-m-d'));
    $row = $p->prepare('SELECT prozor_od, broj FROM prijave_rate_limit WHERE ip_hash = ?');
    $row->execute([$key]);
    $r = $row->fetch();
    $now = time();
    if (!$r || strtotime($r['prozor_od'] . ' UTC') < $now - $windowSec) {
        $p->prepare('REPLACE INTO prijave_rate_limit (ip_hash, prozor_od, broj) VALUES (?, ?, 1)')
            ->execute([$key, gmdate('Y-m-d H:i:s', $now)]);
        return false;
    }
    if ((int) $r['broj'] >= $max) {
        return true;
    }
    $p->prepare('UPDATE prijave_rate_limit SET broj = broj + 1 WHERE ip_hash = ?')->execute([$key]);
    return false;
}

function load_event(PDO $db, string $slug): ?array
{
    $stmt = $db->prepare("SELECT id, slug, naziv_hr, naziv_de, kotizacija, vrsta_prijave, pristup_prijavi, prijave_otvorene, rok_prijave, tajni_kod, datum_pocetak, datum_kraj
                          FROM dogadjaji WHERE slug = ? AND status = 'veroeffentlicht'");
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

function access_allowed(array $ev, ?string $kod): bool
{
    if ($ev['pristup_prijavi'] !== 'clanovi') {
        return true;
    }
    return $ev['tajni_kod'] !== null && $kod !== null && hash_equals($ev['tajni_kod'], $kod);
}

function registration_open(array $ev): bool
{
    if (!(int) $ev['prijave_otvorene']) {
        return false;
    }
    if ($ev['rok_prijave'] !== null && strtotime($ev['rok_prijave'] . ' UTC') < time()) {
        return false;
    }
    $end = $ev['datum_kraj'] ?? $ev['datum_pocetak'];
    return strtotime($end . ' UTC') >= time();
}

$db = hnkcms_db();

// ---------------------------------------------------------------------------
// GET: validacija članskog koda
// ---------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $slug = trim((string) ($_GET['slug'] ?? ''));
    $kod = isset($_GET['kod']) ? trim((string) $_GET['kod']) : null;
    if ($slug === '') {
        respond(200, ['valid' => false]);
    }
    $ev = load_event($db, $slug);
    respond(200, ['valid' => $ev ? access_allowed($ev, $kod) : false]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['error' => 'method_not_allowed']);
}

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(400, ['error' => 'bad_request']);
}

$priv = hnkcms_db_prijave();

// ---------------------------------------------------------------------------
// POST ?action=otkazi — soft otkaz (hard-delete radi purge nakon 30 dana)
// ---------------------------------------------------------------------------
if (($_GET['action'] ?? '') === 'otkazi') {
    $token = trim((string) ($body['token'] ?? ''));
    if ($token === '' || strlen($token) < 16 || strlen($token) > 64) {
        respond(400, ['error' => 'bad_request']);
    }
    if (rate_limited($priv, 'c', 10, 600)) {
        respond(429, ['error' => 'rate_limited']);
    }
    $stmt = $priv->prepare('SELECT * FROM prijave WHERE otkazni_token_hash = ?');
    $stmt->execute([hash('sha256', $token)]);
    $pr = $stmt->fetch();
    if (!$pr) {
        respond(404, ['error' => 'not_found']);
    }
    $naslov = $pr['dogadjaj_naziv_hr'] ?: ($pr['dogadjaj_naziv_de'] ?: '');
    if ((int) $pr['otkazana']) {
        respond(200, ['ok' => true, 'already' => true, 'dogadjaj' => $naslov]);
    }
    $priv->prepare('UPDATE prijave SET otkazana = 1, datum_otkaza = UTC_TIMESTAMP() WHERE id = ?')->execute([$pr['id']]);

    $tko = $pr['tip'] === 'osoba' ? trim($pr['ime'] . ' ' . $pr['prezime']) : (string) $pr['naziv_ekipe'];
    $e = 'hnkcms_mail_esc';
    hnkcms_send_mail(
        hnkcms_mail_config()['contact_to'],
        "Otkazana prijava · {$tko} · {$naslov}",
        '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><p><strong>Prijava je otkazana.</strong></p>'
        . '<p>Događaj: <strong>' . $e($naslov) . '</strong><br>' . ($pr['tip'] === 'osoba' ? 'Osoba' : 'Ekipa') . ': <strong>' . $e($tko) . '</strong>'
        . ((int) $pr['broj_osoba'] > 1 ? ' (' . (int) $pr['broj_osoba'] . ' osoba)' : '') . '<br>E-mail: ' . $e($pr['email']) . '</p></div>',
        $pr['email']
    );
    respond(200, ['ok' => true, 'dogadjaj' => $naslov]);
}

// ---------------------------------------------------------------------------
// POST — nova prijava
// ---------------------------------------------------------------------------
if (!empty($body['company'])) {
    respond(200, ['ok' => true]); // honeypot: botu "uspjeh"
}
if (rate_limited($priv, 'r', 5, 600)) {
    respond(429, ['error' => 'rate_limited']);
}

$type = ($body['type'] ?? '') === 'ekipa' ? 'ekipa' : ((($body['type'] ?? '') === 'osoba') ? 'osoba' : null);
$slug = trim((string) ($body['slug'] ?? ''));
$kod = isset($body['kod']) && $body['kod'] !== null && $body['kod'] !== '' ? trim((string) $body['kod']) : null;
$locale = ($body['locale'] ?? '') === 'de' ? 'de' : 'hr';
$email = trim((string) ($body['email'] ?? ''));
$telefon = mb_substr(trim((string) ($body['telefon'] ?? '')), 0, 60);
$privola = ($body['privola'] ?? false) === true;

if (!$type || $slug === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
    respond(422, ['error' => 'validation']);
}
if (!$privola) {
    respond(422, ['error' => 'consent_required']);
}

$ime = $prezime = $nazivEkipe = $kontaktOsoba = null;
$brojOsoba = 1;
$napomena = null;
if ($type === 'osoba') {
    $ime = mb_substr(trim((string) ($body['ime'] ?? '')), 0, 80);
    $prezime = mb_substr(trim((string) ($body['prezime'] ?? '')), 0, 80);
    $brojOsoba = min(50, max(1, (int) round((float) ($body['brojOsoba'] ?? 1)) ?: 1));
    $napomena = mb_substr(trim((string) ($body['napomena'] ?? '')), 0, 1000) ?: null;
    if ($ime === '' || $prezime === '') {
        respond(422, ['error' => 'validation']);
    }
    $naslovPrijave = "{$ime} {$prezime}" . ($brojOsoba > 1 ? " ({$brojOsoba} osoba)" : '');
} else {
    $nazivEkipe = mb_substr(trim((string) ($body['nazivEkipe'] ?? '')), 0, 120);
    $kontaktOsoba = mb_substr(trim((string) ($body['kontaktOsoba'] ?? '')), 0, 120);
    if ($nazivEkipe === '' || $kontaktOsoba === '') {
        respond(422, ['error' => 'validation']);
    }
    $naslovPrijave = $nazivEkipe;
}

$ev = load_event($db, $slug);
if (!$ev) {
    respond(404, ['error' => 'not_found']);
}
if ($ev['vrsta_prijave'] !== $type) {
    respond(422, ['error' => 'wrong_type']);
}
if (!registration_open($ev)) {
    respond(409, ['error' => 'closed']);
}
if (!access_allowed($ev, $kod)) {
    respond(403, ['error' => 'forbidden']);
}

$token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
try {
    $priv->prepare(
        'INSERT INTO prijave (tip, dogadjaj_id, dogadjaj_slug, dogadjaj_naziv_hr, dogadjaj_naziv_de, dogadjaj_datum_kraj,
                              ime, prezime, naziv_ekipe, kontakt_osoba, email, telefon, broj_osoba, napomena, jezik,
                              privola_at, datum_prijave, otkazni_token_hash)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP(),?)'
    )->execute([
        $type, (int) $ev['id'], $ev['slug'], $ev['naziv_hr'], $ev['naziv_de'], $ev['datum_kraj'] ?? $ev['datum_pocetak'],
        $ime, $prezime, $nazivEkipe, $kontaktOsoba, $email, $telefon ?: null, $brojOsoba, $napomena, $locale,
        hash('sha256', $token),
    ]);
    $newId = (int) $priv->lastInsertId();
} catch (Throwable $t) {
    error_log('[prijava] insert failed: ' . $t->getMessage());
    respond(502, ['error' => 'store_failed']);
}

// --- e-mailovi (prijava je već spremljena; neuspjeh maila je ne poništava) ---
$e = 'hnkcms_mail_esc';
$naslovEventa = ($locale === 'de' ? $ev['naziv_de'] : $ev['naziv_hr']) ?: ($ev['naziv_hr'] ?: $ev['slug']);
$siteBase = rtrim((string) (hnkcms_config()['site_base_url'] ?? 'https://kroatien-schwyz.vercel.app'), '/');
$cancelUrl = "{$siteBase}/{$locale}/otkazi-prijavu?token={$token}";

$details = ['Događaj' => $naslovEventa]
    + ($type === 'osoba' ? ['Ime i prezime' => "{$ime} {$prezime}", 'Broj osoba' => (string) $brojOsoba] : ['Naziv ekipe' => $nazivEkipe, 'Kontakt osoba' => $kontaktOsoba])
    + ['E-mail' => $email]
    + ($telefon ? ['Telefon' => $telefon] : [])
    + ($napomena ? ['Napomena' => $napomena] : [])
    + ($ev['kotizacija'] ? ['Kotizacija' => $ev['kotizacija']] : []);
$rows = '';
foreach ($details as $k => $v) {
    $rows .= '<tr><td style="padding:4px 14px 4px 0;color:#666;white-space:nowrap">' . $e($k) . ':</td><td style="padding:4px 0"><strong>' . $e((string) $v) . '</strong></td></tr>';
}
$table = '<table style="border-collapse:collapse;font-size:15px">' . $rows . '</table>';

$cfg = hnkcms_mail_config();
$notifOk = hnkcms_send_mail(
    $cfg['contact_to'],
    "Nova prijava · {$naslovPrijave} · {$naslovEventa}",
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><p><strong>Nova prijava na događaj</strong> (' . $type . ')</p>' . $table . '</div>',
    $email
);

$hr = $locale === 'hr';
$pozdrav = $type === 'osoba' ? $ime : $kontaktOsoba;
$confHtml = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.55">'
    . '<p>' . ($hr ? 'Pozdrav' : 'Hallo') . ' ' . $e((string) $pozdrav) . ',</p>'
    . '<p>' . ($hr ? 'zaprimili smo vašu prijavu na događaj <strong>' . $e($naslovEventa) . '</strong>.' : 'wir haben Ihre Anmeldung für <strong>' . $e($naslovEventa) . '</strong> erhalten.') . '</p>'
    . $table
    . ($ev['kotizacija'] ? '<p>' . ($hr ? 'Kotizacija iznosi <strong>' . $e($ev['kotizacija']) . '</strong> — informacije o plaćanju dobit ćete od organizatora.' : 'Das Startgeld beträgt <strong>' . $e($ev['kotizacija']) . '</strong> — Angaben zur Zahlung erhalten Sie vom Organisator.') . '</p>' : '')
    . '<p>' . ($hr ? 'Ako ne možete doći, prijavu možete otkazati ovdje:' : 'Falls Sie nicht teilnehmen können, können Sie Ihre Anmeldung hier stornieren:') . '<br><a href="' . $e($cancelUrl) . '">' . $e($cancelUrl) . '</a></p>'
    . '<p>' . ($hr ? 'Sportski pozdrav' : 'Sportliche Grüsse') . ',<br>HNK Kroatien Schwyz</p></div>';
$confOk = hnkcms_send_mail($email, ($hr ? 'Potvrda prijave — ' : 'Anmeldebestätigung — ') . $naslovEventa, $confHtml, $cfg['contact_to']);

respond(200, ['ok' => true, 'id' => $newId, 'emailOk' => $notifOk && $confOk]);
