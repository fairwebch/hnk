<?php
/**
 * Jednokratna migracija: uzima stvarne momčadi iz Sanityja (grupne
 * fotografije već povučene lokalno) i generira isti WebP izlaz koji bi
 * proizvela WebpPipeline::process() s WIDTHS_WIDE — bez pozivanja te metode
 * (move_uploaded_file() traži pravi HTTP upload). Isti obrazac kao
 * seed-real-clan-uprave.php; QUALITY se čita refleksijom da ostane usklađen.
 *
 * Stanje u Sanityju 07.09. (GROQ javni read API): 3 momčadi, sve tri imaju
 * SAMO grupnaFotografija + popisImena (legacy redovi imena). igraci[],
 * trener, liga, terminTreninga, coverImage, description i gallery su prazni
 * na sve tri — ništa se ne izmišlja, seed prenosi točno to stanje.
 *
 * Upotreba: php bin/seed-real-momcadi.php <izvorni_dir> <izlazni_dir>
 * Izlaz: <izlazni_dir>/uploads/*        (upload u uploads/momcadi/ na serveru)
 *        <izlazni_dir>/momcadi-insert.sql
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-momcadi.php <izvorni_dir> <izlazni_dir>\n");
    exit(1);
}
[, $srcDir, $outDir] = $argv;

$ref = new ReflectionClass('WebpPipeline');
$quality = $ref->getConstant('QUALITY');
$widths = WebpPipeline::WIDTHS_WIDE; // grupna fotografija = hero/1200px prikaz

$uploadsOut = "{$outDir}/uploads";
$originalsOut = "{$uploadsOut}/originals";
@mkdir($originalsOut, 0755, true);

// Sanity redoslijed 10/20/30 zadržan 1:1. Sanity CDN je izvore servirao kao
// .webp URL, ali su bajtovi JPEG (2000x1125) — zato se tip detektira po MIME-u,
// ne po ekstenziji.
$teams = [
    ['id' => 1, 'slug' => 'aktivni', 'file' => 'aktivni.jpg', 'naziv_hr' => 'Aktivni', 'naziv_de' => 'Aktive', 'red' => 10, 'popis' => [
        ['Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Darijo, Andre, Marko, Dario', 10],
        ['Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Ivan, *, Marko, Josip', 20],
    ]],
    ['id' => 2, 'slug' => 'seniori', 'file' => 'seniori.jpg', 'naziv_hr' => 'Seniori', 'naziv_de' => 'Senioren', 'red' => 20, 'popis' => [
        ['Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Denis, Nikola, Josip, Ilica, Elvis', 10],
        ['Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Ilija, Robert, Ivan', 20],
        ['Nisu na slici', 'Nicht auf dem Bild', 'Burdo, Dani', 30],
    ]],
    ['id' => 3, 'slug' => 'juniori', 'file' => 'juniori.jpg', 'naziv_hr' => 'Juniori', 'naziv_de' => 'Junioren', 'red' => 30, 'popis' => [
        ['Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Josip, Lian, Darijo, Ilijan, Iven', 10],
        ['Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Keny, Amar, Alen, Petar, Leon, Ivan, Leny', 20],
    ]],
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

$loaders = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp'];
$finfo = new finfo(FILEINFO_MIME_TYPE);

$teamRows = [];
$popisRows = [];

foreach ($teams as $t) {
    $srcPath = "{$srcDir}/{$t['file']}";
    $mime = $finfo->file($srcPath);
    if (!isset($loaders[$mime])) {
        fwrite(STDERR, "Nepodržan MIME {$mime} za {$srcPath}\n");
        exit(1);
    }
    $ext = $mime === 'image/jpeg' ? 'jpg' : ($mime === 'image/png' ? 'png' : 'webp');
    $base = "grupna-{$t['id']}-" . bin2hex(random_bytes(4));

    $src = ($loaders[$mime])($srcPath);
    imagesavealpha($src, true);
    $srcW = imagesx($src);
    $srcH = imagesy($src);
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

    $teamRows[] = '(' . implode(', ', [
        sqlVal($t['slug']), sqlVal($t['naziv_hr']), sqlVal($t['naziv_de']), sqlVal($t['red']),
        sqlVal("originals/{$base}.{$ext}"), sqlVal($files['small']), sqlVal($files['medium']), sqlVal($files['large']),
        0, sqlVal($srcW), sqlVal($srcH), "'veroeffentlicht'",
    ]) . ')';

    foreach ($t['popis'] as [$hr, $de, $imena, $red]) {
        $popisRows[] = '((SELECT id FROM momcadi WHERE slug = ' . sqlVal($t['slug']) . '), '
            . implode(', ', [sqlVal($hr), sqlVal($de), sqlVal($imena), sqlVal($red)]) . ')';
    }

    echo "OK: {$t['naziv_hr']} -> {$files['small']} / {$files['medium']} / {$files['large']} ({$srcW}x{$srcH}), " . count($t['popis']) . " redova imena\n";
}

$sql = "-- Generirano iz bin/seed-real-momcadi.php — 3 stvarne momčadi povučene iz Sanityja 07.09.\n"
    . "-- Pokrenuti NAKON schema.sql. Prije ovoga uploadati sadržaj {$uploadsOut}\n"
    . "-- u uploads/momcadi/ na serveru (imena datoteka MORAJU se poklapati).\n\n"
    . "INSERT INTO momcadi\n"
    . "  (slug, naziv_hr, naziv_de, redoslijed, grupna_original, grupna_small, grupna_medium, grupna_large, grupna_is_vector, grupna_width, grupna_height, status)\n"
    . "VALUES\n  " . implode(",\n  ", $teamRows) . ";\n\n"
    . "INSERT INTO momcad_popis_imena (momcad_id, oznaka_hr, oznaka_de, imena, redoslijed)\nVALUES\n  "
    . implode(",\n  ", $popisRows) . ";\n";

file_put_contents("{$outDir}/momcadi-insert.sql", $sql);
echo "\nGotovo. WebP datoteke: {$uploadsOut}\nSQL: {$outDir}/momcadi-insert.sql\n";
