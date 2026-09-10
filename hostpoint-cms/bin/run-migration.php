<?php
/**
 * CLI: izvršava jednu .sql migracijsku datoteku (iz migrations/) protiv baze
 * na koju pokazuje config.php ove instalacije — isti obrazac kao
 * create-admin.php: koristi hnkcms_db()/hnkcms_config(), lozinka nikad ne
 * prolazi kroz argumente/izlaz ove skripte.
 *
 * Pokrenuti na Hostpointu preko SSH (radi protiv BAZE KOJU LOKALNI
 * config.php te instalacije definira — staging ili produkcija, ovisno gdje
 * je skripta uploadana i koji config.php nalazi):
 *   php bin/run-migration.php <putanja-do-.sql>
 *
 * Migracijske datoteke u migrations/ su pisane kao niz samostalnih SQL
 * naredbi (ALTER/CREATE/SET/PREPARE/EXECUTE/DEALLOCATE, svaka idempotentna
 * — vidi komentare u svakoj datoteci) razdvojenih ';'. Nijedna od njih nema
 * ';' unutar navodnika, pa je jednostavan split siguran. Naredbe se šalju
 * redom preko ISTE konekcije (SET @var ostaje vidljiv sljedećoj naredbi,
 * kao i u phpMyAdmin "SQL" tabu). DDL (ALTER/CREATE) u MySQL/MariaDB nema
 * transakcije — ne pokušavamo rollback, svaka migracija je već dizajnirana
 * da bude siguran re-run ako nešto prekine na pola.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    die("Samo za CLI.\n");
}
require __DIR__ . '/../public/admin/includes/db.php';

$path = $argv[1] ?? null;
if (!$path || !is_file($path)) {
    fwrite(STDERR, "Upotreba: php bin/run-migration.php <putanja-do-.sql>\n");
    exit(1);
}

$sql = file_get_contents($path);
if ($sql === false) {
    fwrite(STDERR, "Ne mogu pročitati: {$path}\n");
    exit(1);
}

// Ukloni linije-komentare (počinju s "--") PRIJE splita na ';' -- hrvatski
// tekst u komentarima zna sadržavati ';' kao interpunkciju (npr. "prikazan);
// isključiti..."), pa split-pa-strip krivo lomi statement na tom mjestu.
$noComments = preg_replace('/^\s*--.*$/m', '', $sql);
$statements = array_values(array_filter(array_map('trim', explode(';', $noComments)), fn($s) => $s !== ''));

if (!$statements) {
    fwrite(STDERR, "Nema izvršivih naredbi u {$path} (prazna datoteka ili samo komentari?).\n");
    exit(1);
}

$db = hnkcms_db();
$n = 0;
foreach ($statements as $stmt) {
    try {
        $db->exec($stmt);
        $n++;
    } catch (PDOException $e) {
        fwrite(STDERR, "GREŠKA na naredbi #" . ($n + 1) . " od " . count($statements) . ":\n");
        fwrite(STDERR, substr($stmt, 0, 200) . "\n");
        fwrite(STDERR, $e->getMessage() . "\n");
        exit(1);
    }
}

echo "OK: {$path} — {$n} naredbi izvršeno na bazi.\n";
