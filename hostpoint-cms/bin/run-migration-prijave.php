<?php
/**
 * CLI: izvršava jednu .sql migracijsku datoteku protiv PRIVATNE prijave baze
 * (config()['db_prijave']) — isto kao run-migration.php, ali za tu zasebnu
 * bazu umjesto glavne hnkcms baze (run-migration.php se spaja isključivo na
 * hnkcms_db()/'db' stupac, ne može pogoditi 'db_prijave'). Lozinka nikad ne
 * prolazi kroz argumente/izlaz ove skripte.
 *
 * Pokrenuti na Hostpointu preko SSH (radi protiv PRIVATNE baze koju LOKALNI
 * config.php te instalacije definira — staging ili produkcija):
 *   php bin/run-migration-prijave.php <putanja-do-.sql>
 *
 * bin/ NIJE u docrootu (deploy.sh ga ne šalje) — na serveru živi kao
 * ~/www/bin/ (staging, dijeljeno s ~/www/config/, ravan raspored) ili
 * ~/www/api.kroatien-schwyz.ch/bin/ (produkcija, ugniježđeno pored public/).
 * Isti dual-path obrazac kao već postojeći bin/purge-prijave.php: proba
 * lokalni repo raspored, pa raspored stagingа, tako da JEDNA datoteka radi
 * na oba servera bez ručne prilagodbe puta.
 *
 * Format migracijskih datoteka i logika splita/izvršavanja identični su
 * run-migration.php — vidi taj fajl za detaljan komentar.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    die("Samo za CLI.\n");
}

// Lokalni repo layout (bin/../public/…) ili server layout (~/www/bin/../<docroot>/…).
foreach ([
    __DIR__ . '/../public/admin/includes/db-prijave.php',
    __DIR__ . '/../api-staging.kroatien-schwyz.ch/admin/includes/db-prijave.php',
] as $inc) {
    if (is_file($inc)) {
        require $inc;
        break;
    }
}
if (!function_exists('hnkcms_db_prijave')) {
    fwrite(STDERR, "db-prijave.php nije pronađen pored bin/.\n");
    exit(1);
}

$path = $argv[1] ?? null;
if (!$path || !is_file($path)) {
    fwrite(STDERR, "Upotreba: php bin/run-migration-prijave.php <putanja-do-.sql>\n");
    exit(1);
}

$sql = file_get_contents($path);
if ($sql === false) {
    fwrite(STDERR, "Ne mogu pročitati: {$path}\n");
    exit(1);
}

$noComments = preg_replace('/^\s*--.*$/m', '', $sql);
$statements = array_values(array_filter(array_map('trim', explode(';', $noComments)), fn($s) => $s !== ''));

if (!$statements) {
    fwrite(STDERR, "Nema izvršivih naredbi u {$path} (prazna datoteka ili samo komentari?).\n");
    exit(1);
}

$db = hnkcms_db_prijave();
$n = 0;
foreach ($statements as $stmt) {
    try {
        // query(), ne exec(): kad je već-primijenjena grana odabere "EXECUTE
        // stmt" nad "SELECT 1" (idempotentni no-op), taj EXECUTE vraća
        // rezultat-set — exec() ga ne konzumira, pa sljedeća naredba
        // (DEALLOCATE PREPARE) na istoj konekciji baci "Cannot execute
        // queries while other unbuffered queries are active." query()
        // vraća PDOStatement čiji kursor PHP zatvara kad se odbaci
        // (rezultat se ovdje namjerno ne koristi), pa je ponovno pokretanje
        // iste migracije stvarno sigurno, ne samo naizgled.
        $db->query($stmt);
        $n++;
    } catch (PDOException $e) {
        fwrite(STDERR, "GREŠKA na naredbi #" . ($n + 1) . " od " . count($statements) . ":\n");
        fwrite(STDERR, substr($stmt, 0, 200) . "\n");
        fwrite(STDERR, $e->getMessage() . "\n");
        exit(1);
    }
}

echo "OK: {$path} — {$n} naredbi izvršeno na PRIVATNOJ prijave bazi.\n";
