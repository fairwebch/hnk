<?php
/**
 * Jednokratna migracija: uzima stvarne sponzore iz Sanityja (izvorne
 * datoteke već povučene i spremljene lokalno) i generira isti WebP/SVG
 * izlaz koji bi proizvela WebpPipeline::process() da su prošli kroz pravi
 * upload endpoint — bez pozivanja te metode direktno (move_uploaded_file()
 * unutra zahtijeva stvarni HTTP upload, ne radi na proizvoljnoj lokalnoj
 * datoteci). Iste WIDTHS/QUALITY konstante i SVG sanitizacija kao
 * webp.php — čitaju se refleksijom da ostanu usklađeni ako se pipeline
 * promijeni.
 *
 * Upotreba: php bin/seed-real-sponsors.php <izvorni_dir> <izlazni_dir>
 * Izlaz: <izlazni_dir>/uploads/*        (upload u uploads/sponzori/ na serveru)
 *        <izlazni_dir>/sponsors-insert.sql
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-sponsors.php <izvorni_dir> <izlazni_dir>\n");
    exit(1);
}
[, $srcDir, $outDir] = $argv;

$ref = new ReflectionClass('WebpPipeline');
$widths = $ref->getConstant('WIDTHS');   // ['small'=>240,'medium'=>480,'large'=>800]
$quality = $ref->getConstant('QUALITY'); // 82
$sanitize = $ref->getMethod('sanitizeSvg');
$sanitize->setAccessible(true);
$svgDims = $ref->getMethod('svgDimensions');
$svgDims->setAccessible(true);

$uploadsOut = "{$outDir}/uploads";
$originalsOut = "{$uploadsOut}/originals";
@mkdir($originalsOut, 0755, true);

// Stvarni podaci iz Sanityja (sponzor.ts polja: name, package, link, order),
// povučeni preko GROQ javnog read API-ja 07.09. — svi link=null u Sanityju
// trenutno (nijedan sponzor nema postavljenu web poveznicu).
$sponsors = [
    ['id' => 1, 'file' => 'masada.png', 'naziv' => 'Masada Swiss', 'paket' => 'Premium', 'link' => null, 'red' => 20],
    ['id' => 2, 'file' => 'autocenter.png', 'naziv' => 'Autocenter Goldau AG', 'paket' => 'Standard', 'link' => null, 'red' => 30],
    ['id' => 3, 'file' => 'hsl.svg', 'naziv' => 'HSL AG', 'paket' => 'Standard', 'link' => null, 'red' => 40],
    ['id' => 4, 'file' => 'plana.svg', 'naziv' => 'PlanA AG Gebäudetechnik', 'paket' => 'Standard', 'link' => null, 'red' => 50],
];

function sqlVal($v): string
{
    if ($v === null) {
        return 'NULL';
    }
    if (is_int($v)) {
        return (string) $v;
    }
    return "'" . str_replace("'", "''", (string) $v) . "'";
}

$insertRows = [];

foreach ($sponsors as $s) {
    $srcPath = "{$srcDir}/{$s['file']}";
    $ext = pathinfo($s['file'], PATHINFO_EXTENSION);
    $base = "sponzor-{$s['id']}-" . bin2hex(random_bytes(4));

    if ($ext === 'svg') {
        $raw = file_get_contents($srcPath);
        $clean = $sanitize->invoke(null, $raw);
        $filename = "{$base}.svg";
        file_put_contents("{$uploadsOut}/{$filename}", $clean);
        copy($srcPath, "{$originalsOut}/{$filename}");
        [$w, $h] = $svgDims->invoke(null, $clean);
        $isVector = 1;
        $small = $medium = $large = $filename;
        $originalRel = "originals/{$filename}";
    } else {
        $src = imagecreatefrompng($srcPath);
        imagesavealpha($src, true);
        $srcW = imagesx($src);
        $srcH = imagesy($src);
        $originalRel = "originals/{$base}.{$ext}";
        copy($srcPath, "{$originalsOut}/{$base}.{$ext}");

        $files = [];
        foreach ($widths as $key => $targetW) {
            $w = min($targetW, $srcW);
            $h = (int) round($srcH * ($w / $srcW));
            $canvas = imagecreatetruecolor($w, $h);
            imagesavealpha($canvas, true);
            imagealphablending($canvas, false);
            imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
            imagecopyresampled($canvas, $src, 0, 0, 0, 0, $w, $h, $srcW, $srcH);
            $fname = "{$base}-{$key}.webp";
            imagewebp($canvas, "{$uploadsOut}/{$fname}", $quality);
            imagedestroy($canvas);
            $files[$key] = $fname;
        }
        imagedestroy($src);
        $w = $srcW;
        $h = $srcH;
        $isVector = 0;
        $small = $files['small'];
        $medium = $files['medium'];
        $large = $files['large'];
    }

    $insertRows[] = '(' . implode(', ', [
        sqlVal($s['naziv']),
        sqlVal($originalRel),
        sqlVal($small),
        sqlVal($medium),
        sqlVal($large),
        sqlVal($isVector),
        sqlVal($w),
        sqlVal($h),
        sqlVal($s['link']),
        sqlVal($s['paket']),
        sqlVal($s['red']),
    ]) . ')';

    echo "OK: {$s['naziv']} -> {$small} / {$medium} / {$large} ({$w}x{$h})\n";
}

$sql = "-- Generirano iz bin/seed-real-sponsors.php — 4 stvarna sponzora povučena iz Sanityja 07.09.\n"
    . "-- Pokrenuti u phpMyAdmin NAKON schema.sql. Prije ovoga uploadati sadržaj\n"
    . "-- {$uploadsOut} u uploads/sponzori/ na serveru (imena datoteka MORAJU se poklapati).\n\n"
    . "INSERT INTO sponzori\n"
    . "  (naziv, logo_original, logo_small, logo_medium, logo_large, logo_is_vector, logo_width, logo_height, link, paket, redoslijed, status)\n"
    . "VALUES\n  "
    . implode(",\n  ", array_map(fn($row) => substr($row, 0, -1) . ", 'veroeffentlicht')", $insertRows))
    . ";\n";

file_put_contents("{$outDir}/sponsors-insert.sql", $sql);
echo "\nGotovo. WebP/SVG datoteke: {$uploadsOut}\nSQL: {$outDir}/sponsors-insert.sql\n";
