<?php
/**
 * PDO konekcija na PRIVATNU bazu prijava (hidapifa_hnkprijave) — zaseban
 * MySQL korisnik koji nema grant na javnu bazu, i obrnuto. Uključuju je SAMO
 * api/prijava.php, admin stranice prijava i bin/purge-prijave.php. Javni
 * api/*.php endpointi je namjerno nikad ne uključuju.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function hnkcms_db_prijave(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = hnkcms_config()['db_prijave'] ?? null;
        if (!$c || empty($c['pass']) || $c['pass'] === 'CHANGE_ME') {
            http_response_code(503);
            die('db_prijave nije konfiguriran u config.php.');
        }
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $c['host'], $c['name'], $c['charset'] ?? 'utf8mb4');
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}
