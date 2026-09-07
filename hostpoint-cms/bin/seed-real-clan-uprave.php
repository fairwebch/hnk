<?php
/**
 * Jednokratna migracija: uzima stvarne članove uprave iz Sanityja (izvorne
 * fotografije već povučene i spremljene lokalno) i generira isti WebP izlaz
 * koji bi proizvela WebpPipeline::process() da su prošli kroz pravi upload
 * endpoint — bez pozivanja te metode direktno (move_uploaded_file() unutra
 * zahtijeva stvarni HTTP upload, ne radi na proizvoljnoj lokalnoj datoteci).
 * Iste WIDTHS/QUALITY konstante kao webp.php — čitaju se refleksijom da
 * ostanu usklađene ako se pipeline promijeni. Isti obrazac kao
 * bin/seed-real-sponsors.php (Modul 1).
 *
 * Upotreba: php bin/seed-real-clan-uprave.php <izvorni_dir> <izlazni_dir>
 * Izlaz: <izlazni_dir>/uploads/*        (upload u uploads/clan-uprave/ na serveru)
 *        <izlazni_dir>/clan-uprave-insert.sql
 */
declare(strict_types=1);

require __DIR__ . '/../public/admin/includes/webp.php';

if (PHP_SAPI !== 'cli' || $argc < 3) {
    fwrite(STDERR, "Upotreba: php bin/seed-real-clan-uprave.php <izvorni_dir> <izlazni_dir>\n");
    exit(1);
}
[, $srcDir, $outDir] = $argv;

$ref = new ReflectionClass('WebpPipeline');
$widths = $ref->getConstant('WIDTHS');   // ['small'=>240,'medium'=>480,'large'=>800]
$quality = $ref->getConstant('QUALITY'); // 82

$uploadsOut = "{$outDir}/uploads";
$originalsOut = "{$uploadsOut}/originals";
@mkdir($originalsOut, 0755, true);

// Stvarni podaci iz Sanityja (clanUprave.ts polja: name, role, zaduzenje,
// phone, image, order), povučeni preko GROQ javnog read API-ja 07.09.
// 8 od 13 članova ima fotografiju u Sanityju ('file' => null za ostatak —
// frontend prikazuje inicijale za njih, isto kao trenutno na produkciji).
// 'red' = Sanity order * 10 (ostavlja prostor za buduće umetanje između).
$members = [
    ['id' => 1, 'file' => 'b02d55d76f5fba3c759649ac873bea5512d415d9.png', 'ime' => 'Robert Perković', 'funkcija_hr' => 'Predsjednik', 'funkcija_de' => 'Präsident', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 10],
    ['id' => 2, 'file' => '12545ab67a05fa6c413e59c80c395e67cd3f6c69.png', 'ime' => 'Ivica Perković', 'funkcija_hr' => 'Dopredsjednik', 'funkcija_de' => 'Vizepräsident', 'zaduzenje_hr' => 'Zamjena predsjednika i vanjski odnosi', 'zaduzenje_de' => 'Stellvertretung des Präsidenten und Aussenbeziehungen', 'telefon' => null, 'red' => 20],
    ['id' => 3, 'file' => '9818b11e146fcb094663dc776e5ab449b1474109.png', 'ime' => 'Danijel Ponjavić', 'funkcija_hr' => 'Tajnik', 'funkcija_de' => 'Schriftführer', 'zaduzenje_hr' => 'Administracija i članstvo', 'zaduzenje_de' => 'Administration und Mitgliederwesen', 'telefon' => null, 'red' => 30],
    ['id' => 4, 'file' => '61d31e89e06713f9f5e944751251f7d5612e8a0f.png', 'ime' => 'Marko Perković', 'funkcija_hr' => 'Blagajnik', 'funkcija_de' => 'Kassier', 'zaduzenje_hr' => 'Financije i članarine', 'zaduzenje_de' => 'Finanzen und Mitgliederbeiträge', 'telefon' => null, 'red' => 40],
    ['id' => 5, 'file' => '570867681769d9ae56800e5333fa2d47b2760246.png', 'ime' => 'Josip Barić', 'funkcija_hr' => 'Sportski direktor', 'funkcija_de' => 'Sportdirektor', 'zaduzenje_hr' => 'Momčadi i natjecanje', 'zaduzenje_de' => 'Mannschaften und Spielbetrieb', 'telefon' => null, 'red' => 50],
    ['id' => 6, 'file' => null, 'ime' => 'Sara Perković', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 60],
    ['id' => 7, 'file' => null, 'ime' => 'Karlo Pranješ', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 70],
    ['id' => 8, 'file' => null, 'ime' => 'Ivan Lepan', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 80],
    ['id' => 9, 'file' => null, 'ime' => 'Goran Tokić', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 90],
    ['id' => 10, 'file' => '70d36e1fbaeb322774cf89708f07d2234b24cef2.png', 'ime' => 'Dario Perković', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 100],
    ['id' => 11, 'file' => '816d2f18f9cf71a66dbebff19b6467b775f5818c.png', 'ime' => 'Marko Dujak', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 110],
    ['id' => 12, 'file' => 'ad00125405656eacf13f3278bc57e3d0215e95b5.png', 'ime' => 'Ivan Radić', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 120],
    ['id' => 13, 'file' => null, 'ime' => 'Kristijan Marić', 'funkcija_hr' => 'Član Upravnog odbora', 'funkcija_de' => 'Vorstandsmitglied', 'zaduzenje_hr' => null, 'zaduzenje_de' => null, 'telefon' => null, 'red' => 130],
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

foreach ($members as $m) {
    if ($m['file'] === null) {
        // Bez fotografije u Sanityju — svi slika_* ostaju NULL, frontend
        // prikazuje inicijale (isti fallback kao trenutna produkcija).
        $originalRel = $small = $medium = $large = null;
        $isVector = 0;
        $w = $h = null;
        echo "OK (bez slike): {$m['ime']}\n";
    } else {
        $srcPath = "{$srcDir}/{$m['file']}";
        $ext = pathinfo($m['file'], PATHINFO_EXTENSION);
        $base = "clan-{$m['id']}-" . bin2hex(random_bytes(4));

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

        echo "OK: {$m['ime']} -> {$small} / {$medium} / {$large} ({$w}x{$h})\n";
    }

    $insertRows[] = '(' . implode(', ', [
        sqlVal($m['ime']),
        sqlVal($m['funkcija_hr']),
        sqlVal($m['funkcija_de']),
        sqlVal($m['zaduzenje_hr']),
        sqlVal($m['zaduzenje_de']),
        sqlVal($m['telefon']),
        sqlVal($originalRel),
        sqlVal($small),
        sqlVal($medium),
        sqlVal($large),
        sqlVal($isVector),
        sqlVal($w),
        sqlVal($h),
        sqlVal($m['red']),
    ]) . ')';
}

$sql = "-- Generirano iz bin/seed-real-clan-uprave.php — 13 stvarnih članova uprave povučenih iz Sanityja 07.09.\n"
    . "-- Pokrenuti NAKON schema.sql. Prije ovoga uploadati sadržaj {$uploadsOut}\n"
    . "-- u uploads/clan-uprave/ na serveru (imena datoteka MORAJU se poklapati).\n\n"
    . "INSERT INTO clan_uprave\n"
    . "  (ime, funkcija_hr, funkcija_de, zaduzenje_hr, zaduzenje_de, telefon, slika_original, slika_small, slika_medium, slika_large, slika_is_vector, slika_width, slika_height, redoslijed, status)\n"
    . "VALUES\n  "
    . implode(",\n  ", array_map(fn($row) => substr($row, 0, -1) . ", 'veroeffentlicht')", $insertRows))
    . ";\n";

file_put_contents("{$outDir}/clan-uprave-insert.sql", $sql);
echo "\nGotovo. WebP datoteke: {$uploadsOut}\nSQL: {$outDir}/clan-uprave-insert.sql\n";
