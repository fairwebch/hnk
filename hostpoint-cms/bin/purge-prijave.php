<?php
/**
 * Retencija prijava (GDPR/nDSG; politika privatnosti obećava brisanje nakon
 * događaja). Dogovoreno: hard-delete 30 dana nakon kraja događaja i 30 dana
 * nakon otkaza; rate-limit retke starije od 1 h. Zapisuje SAMO brojeve u
 * prijave_purge_log (nikad osobne podatke). Pokreće se dnevno iz crontaba
 * na Hostpointu (bin/ NIJE u docrootu — deploy.sh ga ne šalje, kopira se
 * rsync-om u ~/www/bin/, pored ~/www/config/):
 *   5 3 * * * /usr/bin/php /home/hidapifa/www/bin/purge-prijave.php >> /home/hidapifa/www/bin/purge-prijave.log 2>&1
 */
declare(strict_types=1);

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

const HNKCMS_RETENCIJA_DANA = 30;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

$priv = hnkcms_db_prijave();
$dana = HNKCMS_RETENCIJA_DANA;

$isteklo = $priv->prepare('DELETE FROM prijave WHERE dogadjaj_datum_kraj < UTC_TIMESTAMP() - INTERVAL ? DAY');
$isteklo->execute([$dana]);
$nIsteklo = $isteklo->rowCount();

$otkazano = $priv->prepare('DELETE FROM prijave WHERE otkazana = 1 AND datum_otkaza IS NOT NULL AND datum_otkaza < UTC_TIMESTAMP() - INTERVAL ? DAY');
$otkazano->execute([$dana]);
$nOtkazano = $otkazano->rowCount();

$priv->exec('DELETE FROM prijave_rate_limit WHERE prozor_od < UTC_TIMESTAMP() - INTERVAL 1 HOUR');

$priv->prepare('INSERT INTO prijave_purge_log (obrisano_isteklo, obrisano_otkazano) VALUES (?, ?)')->execute([$nIsteklo, $nOtkazano]);

echo gmdate('Y-m-d H:i:s') . " UTC purge: isteklih={$nIsteklo} otkazanih={$nOtkazano}\n";
