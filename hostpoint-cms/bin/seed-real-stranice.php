<?php
/**
 * Jednokratna migracija: uzima stvarne stranice iz Sanityja (Portable Text
 * body već ručno pretvoren u Markdown — vidi napomenu ispod) i generira
 * INSERT SQL za tablicu `stranice`. Za razliku od seed-real-sponsors.php /
 * seed-real-clan-uprave.php, ovaj modul nema slika pa nema WebpPipeline
 * poziva — samo tekst, radi svugdje (lokalno ili preko SSH-a).
 *
 * Portable Text -> Markdown konverzija NIJE automatizirana u ovom repou
 * (jednokratan posao, PT struktura pročitana preko GROQ javnog read API-ja
 * i ručno preslikana u Markdown podskup koji includes/markdown.php podržava:
 * normal/h2/h3/blockquote stilovi, bullet liste, strong/em marks, link
 * markDefs). Rezultat su .md datoteke u $contentDir, jedna po slug+locale.
 *
 * Upotreba: php bin/seed-real-stranice.php <content_dir> <out_dir>
 * $content_dir mora sadržavati: <slug>.hr.md i <slug>.de.md za svaki slug
 * iz $pages ispod (prazna/nepostojeća datoteka = NULL sadržaj, isto kao
 * kontakt/postani-clan koje trenutno nemaju CMS body u Sanityju).
 * Izlaz: <out_dir>/stranice-insert.sql
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-stranice.php <content_dir> <out_dir>\n");
    exit(1);
}
[, $contentDir, $outDir] = $argv;
@mkdir($outDir, 0755, true);

// Stvarne stranice iz Sanityja (stranica.ts: title, slug, intro, body),
// povučene preko GROQ javnog read API-ja 07.09. Intro je prazan (null) za
// sve 4 u Sanityju trenutno — nije uključen u seed. kontakt/postani-clan
// nemaju CMS body (stranica se sastoji od forme + statičkih i18n stringova),
// pa im je sadržaj_hr/de NULL, isto kao na produkciji danas.
$pages = [
    ['slug' => 'kontakt', 'naslov_hr' => 'Kontakt', 'naslov_de' => 'Kontakt'],
    ['slug' => 'postani-clan', 'naslov_hr' => 'Postani član', 'naslov_de' => 'Mitglied werden'],
    ['slug' => 'impressum', 'naslov_hr' => 'Impressum', 'naslov_de' => 'Impressum'],
    ['slug' => 'datenschutzerklarung', 'naslov_hr' => 'Izjava o zaštiti podataka', 'naslov_de' => 'Datenschutzerklärung'],
];

function sqlVal(?string $v): string
{
    if ($v === null || $v === '') {
        return 'NULL';
    }
    return "'" . str_replace("'", "''", $v) . "'";
}

function readContentFile(string $dir, string $slug, string $locale): ?string
{
    $path = "{$dir}/{$slug}.{$locale}.md";
    if (!is_file($path)) {
        return null;
    }
    $content = trim(file_get_contents($path));
    return $content === '' ? null : $content;
}

$insertRows = [];

foreach ($pages as $p) {
    $sadrzajHr = readContentFile($contentDir, $p['slug'], 'hr');
    $sadrzajDe = readContentFile($contentDir, $p['slug'], 'de');

    $insertRows[] = '(' . implode(', ', [
        sqlVal($p['slug']),
        sqlVal($p['naslov_hr']),
        sqlVal($p['naslov_de']),
        'NULL', // uvod_hr — prazan u Sanityju za sve 4 stranice trenutno
        'NULL', // uvod_de
        sqlVal($sadrzajHr),
        sqlVal($sadrzajDe),
        "'veroeffentlicht'",
    ]) . ')';

    $bodyInfo = $sadrzajHr !== null ? strlen($sadrzajHr) . ' znakova' : 'bez sadržaja (prazno i u Sanityju)';
    echo "OK: {$p['slug']} -> {$bodyInfo}\n";
}

$sql = "-- Generirano iz bin/seed-real-stranice.php — 4 stvarne stranice povučene iz Sanityja 07.09.\n"
    . "-- Pokrenuti NAKON schema.sql.\n\n"
    . "INSERT INTO stranice\n"
    . "  (slug, naslov_hr, naslov_de, uvod_hr, uvod_de, sadrzaj_hr, sadrzaj_de, status)\n"
    . "VALUES\n  "
    . implode(",\n  ", $insertRows)
    . ";\n";

file_put_contents("{$outDir}/stranice-insert.sql", $sql);
echo "\nGotovo. SQL: {$outDir}/stranice-insert.sql\n";
