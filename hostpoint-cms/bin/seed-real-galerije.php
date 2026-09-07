<?php
/**
 * Jednokratna migracija galerija (Modul 5) — najveća dosad: 30 galerija /
 * 1814 slika (~157 MB) iz Sanityja. Za razliku od prethodnih seed skripti,
 * slike se NE preuzimaju lokalno pa rsync-aju: skripta se pokreće DIREKTNO
 * na Hostpoint serveru (PHP 8.3 + GD + curl), preuzima svaku sliku sa Sanity
 * CDN-a i odmah generira WebP varijante preko WebpPipeline::renderVariants()
 * (WIDTHS_WIDE + THUMB_SIZE kvadratni crop — isto što bi admin upload dao).
 *
 * Otporna na prekid: <out_dir>/state.json pamti obrađene slike, ponovno
 * pokretanje preskače gotove. Na kraju piše <out_dir>/galerije-insert.sql
 * (30 redaka galerije + 1814 redaka galerija_slike, FK preko slug subselecta)
 * i ispisuje "DONE" — vanjski monitor čeka taj red.
 *
 * Manifest (JSON) generiran GROQ-om 07.09.: [{n, slug, naziv_hr, naziv_de,
 * kategorija, godina, datum, opis_hr, opis_de, images:[{order, asset, w, h,
 * fmt, alt, url}]}]. Redoslijed slika = Sanity niz (cover je prvi), alt je
 * prazan na svih 1814 (Sanity import ga nikad nije upisao) — ništa se ne izmišlja.
 *
 * Upotreba: php bin/seed-real-galerije.php <manifest.json> <out_dir>
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-galerije.php <manifest.json> <out_dir>\n");
    exit(1);
}
[, $manifestPath, $outDir] = $argv;

$manifest = json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
$uploadsOut = "{$outDir}/uploads";
$originalsOut = "{$uploadsOut}/originals";
@mkdir($originalsOut, 0755, true);

$statePath = "{$outDir}/state.json";
$state = is_file($statePath) ? json_decode(file_get_contents($statePath), true) : [];
$saveState = function () use (&$state, $statePath): void {
    file_put_contents($statePath, json_encode($state), LOCK_EX);
};

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

$total = array_sum(array_map(fn($g) => count($g['images']), $manifest));
$done = 0;
$failed = [];
$start = microtime(true);
echo "START {$total} slika, " . count($manifest) . " galerija, već obrađeno: " . count($state) . "\n";

foreach ($manifest as $g) {
    foreach ($g['images'] as $im) {
        $key = "{$g['n']}-{$im['order']}";
        $done++;
        if (isset($state[$key])) {
            continue;
        }
        try {
            $base = "galerija-{$g['n']}-" . bin2hex(random_bytes(4));
            $tmp = "{$originalsOut}/{$base}.tmp";
            download($im['url'], $tmp);

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
            $files = WebpPipeline::renderVariants($src, $uploadsOut, $base, WebpPipeline::WIDTHS_WIDE, WebpPipeline::THUMB_SIZE);
            imagedestroy($src);

            $state[$key] = ['original' => "originals/{$orig}", 'w' => $w, 'h' => $h] + $files;
            $saveState();
        } catch (Throwable $e) {
            $failed[] = "{$key} ({$g['slug']}): " . $e->getMessage();
            echo "FAIL {$key}: {$e->getMessage()}\n";
        }

        if ($done % 25 === 0) {
            $el = (int) (microtime(true) - $start);
            printf("PROGRESS %d/%d (%ds, %s)\n", $done, $total, $el, $g['slug']);
        }
    }
}

// --- SQL ---------------------------------------------------------------------
function sqlVal($v): string
{
    if ($v === null || $v === '') {
        return 'NULL';
    }
    if (is_int($v)) {
        return (string) $v;
    }
    return "'" . str_replace("'", "''", (string) $v) . "'";
}

$galRows = [];
$imgRows = [];
foreach ($manifest as $g) {
    $galRows[] = '(' . implode(', ', [
        sqlVal($g['slug']), sqlVal($g['naziv_hr']), sqlVal($g['naziv_de']), sqlVal($g['kategorija']),
        sqlVal((int) $g['godina']), sqlVal($g['datum']), sqlVal($g['opis_hr']), sqlVal($g['opis_de']), "'veroeffentlicht'",
    ]) . ')';
    foreach ($g['images'] as $im) {
        $s = $state["{$g['n']}-{$im['order']}"] ?? null;
        if (!$s) {
            continue; // neuspjela slika — izostavljena, vidi FAIL redove u logu
        }
        $imgRows[] = '((SELECT id FROM galerije WHERE slug = ' . sqlVal($g['slug']) . '), ' . implode(', ', [
            sqlVal($s['original']), sqlVal($s['thumb']), sqlVal($s['small']), sqlVal($s['medium']), sqlVal($s['large']),
            0, sqlVal((int) $s['w']), sqlVal((int) $s['h']), sqlVal($im['alt']), sqlVal((int) $im['order']),
        ]) . ')';
    }
}

$sql = "-- Generirano iz bin/seed-real-galerije.php — " . count($galRows) . " galerija / " . count($imgRows) . " slika iz Sanityja 07.09.\n"
    . "-- Pokrenuti NAKON schema.sql; prije toga premjestiti {$uploadsOut}/* u uploads/galerije/.\n\n"
    . "INSERT INTO galerije (slug, naziv_hr, naziv_de, kategorija, godina, datum, opis_hr, opis_de, status)\nVALUES\n  "
    . implode(",\n  ", $galRows) . ";\n\n"
    . "INSERT INTO galerija_slike (galerija_id, slika_original, slika_thumb, slika_small, slika_medium, slika_large, slika_is_vector, slika_width, slika_height, alt, redoslijed)\nVALUES\n  "
    . implode(",\n  ", $imgRows) . ";\n";
file_put_contents("{$outDir}/galerije-insert.sql", $sql);

$el = (int) (microtime(true) - $start);
printf("SUMMARY obrađeno=%d neuspjelo=%d trajanje=%ds sql=%s\n", count($state), count($failed), $el, "{$outDir}/galerije-insert.sql");
foreach ($failed as $f) {
    echo "  FAILED {$f}\n";
}
echo "DONE\n";
