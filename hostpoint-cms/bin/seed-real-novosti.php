<?php
/**
 * Jednokratna migracija novosti (Modul 6): 34 novosti iz Sanityja. Pokreće
 * se NA Hostpoint serveru (kao seed-real-galerije.php): preuzima naslovnu
 * sliku svake novosti sa Sanity CDN-a i generira WebP varijante preko
 * WebpPipeline::renderVariants() (WIDTHS_WIDE). Body je već pretvoren iz
 * Portable Texta u Markdown (u manifestu), s escape-om vodećih brojeva
 * (`1\.`) u pasusima koji nisu liste — stvarni sadržaj ima 15 takvih.
 *
 * Manifest (JSON, GROQ 07.09.): [{n, slug, naslov_hr, naslov_de, datum (ISO),
 * kategorija, sazetak_hr, sazetak_de, sadrzaj_hr, sadrzaj_de,
 * cover:{url, alt, w, h, fmt}}]. DE je prazan na svih 34 (i u Sanityju) —
 * ostaje prazan, HR fallback na sajtu.
 *
 * Upotreba: php bin/seed-real-novosti.php <manifest.json> <out_dir>
 * Izlaz: <out_dir>/uploads/*, <out_dir>/novosti-insert.sql, "DONE" na kraju.
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-novosti.php <manifest.json> <out_dir>\n");
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

$rows = [];
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

    // Sanity ISO datetime (UTC, npr. 2026-04-17T09:43:26Z) -> MySQL DATETIME (UTC).
    $datum = gmdate('Y-m-d H:i:s', strtotime($m['datum']));

    $rows[] = '(' . implode(', ', [
        sqlVal($m['slug']), sqlVal($m['naslov_hr']), sqlVal($m['naslov_de']), sqlVal($datum), sqlVal($m['kategorija']),
        sqlVal($cover['original']), sqlVal($cover['small']), sqlVal($cover['medium']), sqlVal($cover['large']), 0,
        sqlVal($cover['w'] !== null ? (int) $cover['w'] : null), sqlVal($cover['h'] !== null ? (int) $cover['h'] : null), sqlVal($m['cover']['alt']),
        sqlVal($m['sazetak_hr']), sqlVal($m['sazetak_de']), sqlVal($m['sadrzaj_hr']), sqlVal($m['sadrzaj_de']), "'veroeffentlicht'",
    ]) . ')';
}

$sql = "-- Generirano iz bin/seed-real-novosti.php — " . count($rows) . " novosti iz Sanityja 07.09.\n"
    . "-- Pokrenuti NAKON schema.sql; prije toga premjestiti {$uploadsOut}/* u uploads/novosti/.\n\n"
    . "INSERT INTO novosti (slug, naslov_hr, naslov_de, datum, kategorija, cover_original, cover_small, cover_medium, cover_large, cover_is_vector, cover_width, cover_height, cover_alt, sazetak_hr, sazetak_de, sadrzaj_hr, sadrzaj_de, status)\nVALUES\n  "
    . implode(",\n  ", $rows) . ";\n";
file_put_contents("{$outDir}/novosti-insert.sql", $sql);

printf("SUMMARY novosti=%d neuspjelih_covera=%d sql=%s\n", count($rows), count($failed), "{$outDir}/novosti-insert.sql");
foreach ($failed as $f) {
    echo "  FAILED {$f}\n";
}
echo "DONE\n";
