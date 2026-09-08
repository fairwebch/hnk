<?php
/**
 * Jednokratna migracija Modula 8 (pokreće se NA serveru): Sanity singletoni
 * postavkeSajta (3 hero + 3 header fotografije) i klubStranica (uvod, 6
 * timeline stavki, 1 slika) → WebP varijante + INSERT SQL za slike_sajta,
 * klub_stranica, klub_timeline. Izvorne slike se skidaju sa Sanity CDN-a
 * (URL-ovi u manifestu iz GROQ-a), isti obrazac kao seed-real-dogadjaji.php.
 *
 * Upotreba: php bin/seed-real-sajt.php <manifest.json> <izlazni_dir>
 * Izlaz: <izlazni_dir>/uploads/sajt/*, <izlazni_dir>/uploads/klub/*, <izlazni_dir>/sajt-insert.sql
 */
declare(strict_types=1);

foreach ([__DIR__ . '/../public/admin/includes/webp.php', __DIR__ . '/../api-staging.kroatien-schwyz.ch/admin/includes/webp.php'] as $inc) {
    if (is_file($inc)) {
        require $inc;
        break;
    }
}

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-sajt.php <manifest.json> <izlazni_dir>\n");
    exit(1);
}
[, $manifestPath, $outDir] = $argv;
$m = json_decode((string) file_get_contents($manifestPath), true);
$m = $m['result'] ?? $m; // sirovi GROQ odgovor ili već raspakiran objekt
if (!is_array($m) || !isset($m['postavke'], $m['klub'])) {
    fwrite(STDERR, "Neispravan manifest.\n");
    exit(1);
}

const WIDTHS_HERO = ['small' => 480, 'medium' => 1200, 'large' => 2560]; // produkcija je hero servirala na 2560px
$widthsWide = WebpPipeline::WIDTHS_WIDE;

function sqlVal($v): string
{
    if ($v === null) {
        return 'NULL';
    }
    if (is_int($v)) {
        return (string) $v;
    }
    return "'" . str_replace(['\\', "'"], ['\\\\', "''"], (string) $v) . "'";
}

function download(string $url, string $dest): void
{
    $ch = curl_init($url);
    $fp = fopen($dest, 'wb');
    curl_setopt_array($ch, [CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 120]);
    $ok = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    fclose($fp);
    if (!$ok || $code !== 200) {
        throw new RuntimeException("Download nije uspio ({$code}): {$url}");
    }
}

/** Skini sliku, generiraj WebP varijante; vraća kolone slika_*. */
function render(string $url, string $uploadsDir, string $base, array $widths): array
{
    @mkdir("{$uploadsDir}/originals", 0755, true);
    $ext = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'webp';
    $orig = "{$uploadsDir}/originals/{$base}.{$ext}";
    download($url, $orig);
    $src = imagecreatefromstring((string) file_get_contents($orig));
    if ($src === false) {
        throw new RuntimeException("GD ne može učitati {$orig}");
    }
    imagesavealpha($src, true);
    $files = WebpPipeline::renderVariants($src, $uploadsDir, $base, $widths);
    $w = imagesx($src);
    $h = imagesy($src);
    imagedestroy($src);
    return ['original' => "originals/{$base}.{$ext}", 'small' => $files['small'], 'medium' => $files['medium'], 'large' => $files['large'], 'width' => $w, 'height' => $h];
}

/** Portable Text (samo obični paragrafi) → Markdown; uvod/završni su plain paragrafi u Sanityju. */
function blocksToMarkdown(?array $blocks): ?string
{
    if (!$blocks) {
        return null;
    }
    $paras = [];
    foreach ($blocks as $b) {
        if (($b['_type'] ?? '') !== 'block') {
            continue;
        }
        $text = implode('', array_map(fn($c) => $c['text'] ?? '', $b['children'] ?? []));
        $paras[] = $text;
    }
    return implode("\n\n", $paras) ?: null;
}

$sajtDir = "{$outDir}/uploads/sajt";
$klubDir = "{$outDir}/uploads/klub";
@mkdir($sajtDir, 0755, true);
@mkdir($klubDir, 0755, true);

$sql = "-- Generirano iz bin/seed-real-sajt.php (Modul 8) — postavkeSajta + klubStranica iz Sanityja.\n\n";

// --- slike_sajta ---
$rows = [];
$n = 0;
foreach (($m['postavke']['heroSlike'] ?? []) as $i => $img) {
    $n++;
    $r = render($img['url'], $sajtDir, "hero-{$n}-" . bin2hex(random_bytes(4)), WIDTHS_HERO);
    $rows[] = ['hero', ($i + 1) * 10, $r, $img['alt'] ?? null];
    echo "OK hero {$i}: {$r['large']} ({$r['width']}x{$r['height']})\n";
}
foreach (['headerKlub' => 'header_klub', 'headerSponzoring' => 'header_sponzoring', 'headerPostaniClan' => 'header_postani_clan'] as $src => $kljuc) {
    $img = $m['postavke'][$src] ?? null;
    if (!$img || empty($img['url'])) {
        continue;
    }
    $n++;
    $r = render($img['url'], $sajtDir, "{$kljuc}-" . bin2hex(random_bytes(4)), $widthsWide);
    $rows[] = [$kljuc, 10, $r, $img['alt'] ?? null];
    echo "OK {$kljuc}: {$r['large']} ({$r['width']}x{$r['height']})\n";
}
$sql .= "INSERT INTO slike_sajta (kljuc, redoslijed, slika_original, slika_small, slika_medium, slika_large, slika_is_vector, slika_width, slika_height, slika_alt) VALUES\n  "
    . implode(",\n  ", array_map(fn($x) => '(' . implode(', ', [sqlVal($x[0]), sqlVal($x[1]), sqlVal($x[2]['original']), sqlVal($x[2]['small']), sqlVal($x[2]['medium']), sqlVal($x[2]['large']), '0', sqlVal($x[2]['width']), sqlVal($x[2]['height']), sqlVal($x[3])]) . ')', $rows))
    . ";\n\n";

// --- klub_stranica ---
$k = $m['klub'];
$sql .= "INSERT INTO klub_stranica (id, uvod_hr, uvod_de, zavrsni_hr, zavrsni_de) VALUES (1, "
    . implode(', ', [sqlVal(blocksToMarkdown($k['uvod']['hr'] ?? null)), sqlVal(blocksToMarkdown($k['uvod']['de'] ?? null)), sqlVal(blocksToMarkdown($k['zavrsniTekst']['hr'] ?? null)), sqlVal(blocksToMarkdown($k['zavrsniTekst']['de'] ?? null))])
    . ")\n  ON DUPLICATE KEY UPDATE uvod_hr=VALUES(uvod_hr), uvod_de=VALUES(uvod_de), zavrsni_hr=VALUES(zavrsni_hr), zavrsni_de=VALUES(zavrsni_de);\n\n";

// --- klub_timeline ---
$trows = [];
foreach (($k['timeline'] ?? []) as $i => $t) {
    $img = null;
    if (!empty($t['slika']['url'])) {
        $img = render($t['slika']['url'], $klubDir, 'timeline-' . ($i + 1) . '-' . bin2hex(random_bytes(4)), $widthsWide);
        echo "OK timeline {$t['godina']} slika: {$img['large']}\n";
    }
    $trows[] = '(' . implode(', ', [
        sqlVal((int) $t['godina']),
        sqlVal($t['godinaLabela']['hr'] ?? null), sqlVal($t['godinaLabela']['de'] ?? null),
        sqlVal($t['naslov']['hr'] ?? ''), sqlVal($t['naslov']['de'] ?? null),
        sqlVal($t['tekst']['hr'] ?? ''), sqlVal($t['tekst']['de'] ?? null),
        sqlVal($img['original'] ?? null), sqlVal($img['small'] ?? null), sqlVal($img['medium'] ?? null), sqlVal($img['large'] ?? null), '0',
        sqlVal($img['width'] ?? null), sqlVal($img['height'] ?? null), sqlVal($t['slika']['alt'] ?? null),
        sqlVal(($i + 1) * 10),
    ]) . ')';
}
$sql .= "INSERT INTO klub_timeline (godina, godina_labela_hr, godina_labela_de, naslov_hr, naslov_de, tekst_hr, tekst_de, slika_original, slika_small, slika_medium, slika_large, slika_is_vector, slika_width, slika_height, slika_alt, redoslijed) VALUES\n  "
    . implode(",\n  ", $trows) . ";\n";

file_put_contents("{$outDir}/sajt-insert.sql", $sql);
echo "\nGotovo. SQL: {$outDir}/sajt-insert.sql\n";
