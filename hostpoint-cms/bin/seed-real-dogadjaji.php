<?php
/**
 * Jednokratna migracija JAVNOG dijela događaja (Modul 7): 5 događaja iz
 * Sanityja. Pokreće se NA Hostpoint serveru (kao novosti/galerije): skida
 * naslovnu sliku svakog događaja sa Sanity CDN-a i generira WebP varijante
 * (WIDTHS_WIDE). Program stavke idu u dogadjaj_program.
 *
 * SIGURNOST: `tajni_kod` se NE prenosi iz Sanityja — tamošnji kodovi su bili
 * javno čitljivi (production dataset bez tokena), pa se ovdje generira NOVI
 * kod za svaki događaj (isti alfabet kao Sanity generateTajniKod). Prijave
 * (osobni podaci) se ovim skriptom NE diraju — u Sanityju ih i nema (0).
 *
 * Manifest (JSON, GROQ 07.09.): [{n, slug, naziv_hr, naziv_de, kategorija,
 * datum_pocetak, datum_kraj, lokacija, kotizacija, kapacitet, prijava_link,
 * vrsta_prijave, pristup_prijavi, prijave_otvorene, rok_prijave,
 * program:[{vrijeme, opis}], cover:{url, alt, w, h}}]. Sanity reference
 * sponzor/galerija nisu postavljene ni na jednom (null).
 *
 * Upotreba: php bin/seed-real-dogadjaji.php <manifest.json> <out_dir>
 * Izlaz: <out_dir>/uploads/*, <out_dir>/dogadjaji-insert.sql, "DONE".
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-dogadjaji.php <manifest.json> <out_dir>\n");
    exit(1);
}
[, $manifestPath, $outDir] = $argv;

$manifest = json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
$uploadsOut = "{$outDir}/uploads";
$originalsOut = "{$uploadsOut}/originals";
@mkdir($originalsOut, 0755, true);

$loaders = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp', 'image/gif' => 'imagecreatefromgif'];
$exts = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
$finfo = new finfo(FILEINFO_MIME_TYPE);

function download(string $url, string $dest): void
{
    for ($try = 1; $try <= 3; $try++) {
        $ch = curl_init($url);
        $fp = fopen($dest, 'wb');
        curl_setopt_array($ch, [CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60, CURLOPT_FAILONERROR => true]);
        $ok = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        fclose($fp);
        if ($ok && filesize($dest) > 0) {
            return;
        }
        @unlink($dest);
        sleep($try);
    }
    throw new RuntimeException("download failed: {$url} ({$err})");
}

/** SQL literal; backslash MORA biti dupliran (MySQL ga u literalu tretira kao escape). */
function sqlVal($v): string
{
    if ($v === null || $v === '') {
        return 'NULL';
    }
    if (is_int($v)) {
        return (string) $v;
    }
    return "'" . str_replace(['\\', "'"], ['\\\\', "''"], (string) $v) . "'";
}

function noviTajniKod(): string
{
    $chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    $s = '';
    for ($i = 0; $i < 10; $i++) {
        $s .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $s;
}

$mysqlDt = fn(?string $iso) => $iso ? gmdate('Y-m-d H:i:s', strtotime($iso)) : null;

$rows = [];
$programRows = [];
$failed = [];
foreach ($manifest as $m) {
    $cover = ['original' => null, 'small' => null, 'medium' => null, 'large' => null, 'w' => null, 'h' => null];
    try {
        $base = "cover-{$m['n']}-" . bin2hex(random_bytes(4));
        $tmp = "{$originalsOut}/{$base}.tmp";
        download($m['cover']['url'], $tmp);
        $mime = $finfo->file($tmp);
        if (!isset($loaders[$mime])) {
            throw new RuntimeException("nepodržan MIME {$mime}");
        }
        $orig = "{$base}.{$exts[$mime]}";
        rename($tmp, "{$originalsOut}/{$orig}");
        $src = @($loaders[$mime])("{$originalsOut}/{$orig}");
        if ($src === false) {
            throw new RuntimeException('GD ne može učitati sliku');
        }
        imagesavealpha($src, true);
        $w = imagesx($src);
        $h = imagesy($src);
        $files = WebpPipeline::renderVariants($src, $uploadsOut, $base, WebpPipeline::WIDTHS_WIDE);
        imagedestroy($src);
        $cover = ['original' => "originals/{$orig}", 'w' => $w, 'h' => $h] + $files;
        echo "OK: {$m['slug']} ({$w}x{$h})\n";
    } catch (Throwable $e) {
        $failed[] = "{$m['slug']}: " . $e->getMessage();
        echo "FAIL cover {$m['slug']}: {$e->getMessage()}\n";
    }

    $rows[] = '(' . implode(', ', [
        sqlVal($m['slug']), sqlVal($m['naziv_hr']), sqlVal($m['naziv_de']), sqlVal($m['kategorija']),
        sqlVal($mysqlDt($m['datum_pocetak'])), sqlVal($mysqlDt($m['datum_kraj'])), sqlVal($m['lokacija']),
        sqlVal($cover['original']), sqlVal($cover['small']), sqlVal($cover['medium']), sqlVal($cover['large']), 0,
        sqlVal($cover['w'] !== null ? (int) $cover['w'] : null), sqlVal($cover['h'] !== null ? (int) $cover['h'] : null), sqlVal($m['cover']['alt']),
        sqlVal($m['kotizacija']), sqlVal($m['kapacitet']), sqlVal($m['prijava_link']),
        sqlVal($m['vrsta_prijave']), sqlVal($m['pristup_prijavi']), (int) $m['prijave_otvorene'], sqlVal($mysqlDt($m['rok_prijave'])),
        sqlVal(noviTajniKod()), "'veroeffentlicht'",
    ]) . ')';

    foreach ($m['program'] as $i => $p) {
        $programRows[] = '((SELECT id FROM dogadjaji WHERE slug = ' . sqlVal($m['slug']) . '), ' . implode(', ', [
            sqlVal($p['vrijeme']), sqlVal($p['opis']), ($i + 1) * 10,
        ]) . ')';
    }
}

$sql = "-- Generirano iz bin/seed-real-dogadjaji.php — " . count($rows) . " događaja iz Sanityja 07.09. (tajni_kod ROTIRAN, ne prenesen).\n"
    . "-- Pokrenuti NAKON schema.sql; prije toga premjestiti {$uploadsOut}/* u uploads/dogadjaji/.\n\n"
    . "INSERT INTO dogadjaji (slug, naziv_hr, naziv_de, kategorija, datum_pocetak, datum_kraj, lokacija, cover_original, cover_small, cover_medium, cover_large, cover_is_vector, cover_width, cover_height, cover_alt, kotizacija, kapacitet, prijava_link, vrsta_prijave, pristup_prijavi, prijave_otvorene, rok_prijave, tajni_kod, status)\nVALUES\n  "
    . implode(",\n  ", $rows) . ";\n\n"
    . ($programRows ? "INSERT INTO dogadjaj_program (dogadjaj_id, vrijeme, opis, redoslijed)\nVALUES\n  " . implode(",\n  ", $programRows) . ";\n" : '');
file_put_contents("{$outDir}/dogadjaji-insert.sql", $sql);

printf("SUMMARY dogadjaji=%d program=%d neuspjelih_covera=%d sql=%s\n", count($rows), count($programRows), count($failed), "{$outDir}/dogadjaji-insert.sql");
foreach ($failed as $f) {
    echo "  FAILED {$f}\n";
}
echo "DONE\n";
