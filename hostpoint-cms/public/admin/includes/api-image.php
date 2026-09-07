<?php
/**
 * Zajednički JSON serializatori za javne api/*.php endpointe — slika iz
 * {prefix}_* kolona i {hr,de} par iz {prefix}_hr/_de kolona. Izdvojeno kad je
 * stigao 5. modul (dotad kopirano po endpointu; sponzori.php i clan-uprave.php
 * još imaju svoje starije varijante s istim izlazom).
 */

declare(strict_types=1);

/**
 * Slika iz kolona {prefix}_small/medium/large/is_vector/width/height, plus
 * {prefix}_thumb (ako kolona postoji i ima vrijednost) i {prefix}_alt / alt
 * ($altColumn), ili null kad slike nema.
 */
function hnkcms_image_json(array $row, string $prefix, string $uploadsUrl, ?string $altColumn = null): ?array
{
    if (empty($row["{$prefix}_small"])) {
        return null;
    }
    $img = [
        'small' => $uploadsUrl . '/' . $row["{$prefix}_small"],
        'medium' => $uploadsUrl . '/' . $row["{$prefix}_medium"],
        'large' => $uploadsUrl . '/' . $row["{$prefix}_large"],
        'isVector' => (bool) $row["{$prefix}_is_vector"],
        'width' => $row["{$prefix}_width"] !== null ? (int) $row["{$prefix}_width"] : null,
        'height' => $row["{$prefix}_height"] !== null ? (int) $row["{$prefix}_height"] : null,
    ];
    if (!empty($row["{$prefix}_thumb"])) {
        $img['thumb'] = $uploadsUrl . '/' . $row["{$prefix}_thumb"];
    }
    if ($altColumn !== null) {
        $img['alt'] = $row[$altColumn] ?: null;
    }
    return $img;
}

/** {hr, de} iz kolona {prefix}_hr/{prefix}_de, ili null ako su obje prazne. */
function hnkcms_locale_json(array $row, string $prefix): ?array
{
    $hr = $row["{$prefix}_hr"] ?: null;
    $de = $row["{$prefix}_de"] ?: null;
    return ($hr || $de) ? ['hr' => $hr, 'de' => $de] : null;
}
