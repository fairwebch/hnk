<?php
/**
 * JSON oblik jedne novosti — dijele ga api/novosti.php (lista/teaser/detalj).
 * Lista i teaser NE nose body (NewsList/NewsHighlights ga ne koriste; Sanity
 * ga je slao nepotrebno), detalj dodaje body (Markdown -> HTML) i slike u tekstu.
 */

declare(strict_types=1);

/** MySQL DATETIME (UTC) -> ISO 8601 kakav Sanity vraća za `datetime`. */
function hnkcms_datetime_iso(string $mysqlDatetime): string
{
    return str_replace(' ', 'T', $mysqlDatetime) . 'Z';
}

function hnkcms_novost_summary_json(array $row, string $uploadsUrl): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title' => ['hr' => $row['naslov_hr'], 'de' => $row['naslov_de'] ?: null],
        'date' => hnkcms_datetime_iso($row['datum']),
        'category' => $row['kategorija'],
        'coverImage' => hnkcms_image_json($row, 'cover', $uploadsUrl, 'cover_alt'),
        'excerpt' => hnkcms_locale_json($row, 'sazetak'),
    ];
}

function hnkcms_novost_full_json(PDO $db, array $row, string $uploadsUrl): array
{
    $json = hnkcms_novost_summary_json($row, $uploadsUrl);
    $json['body'] = [
        'hr' => hnkcms_markdown_to_html($row['sadrzaj_hr']) ?: null,
        'de' => hnkcms_markdown_to_html($row['sadrzaj_de']) ?: null,
    ];

    $imgs = $db->prepare('SELECT * FROM novost_slike WHERE novost_id = ? ORDER BY redoslijed ASC, id ASC');
    $imgs->execute([(int) $row['id']]);
    $json['images'] = array_values(array_filter(array_map(function ($s) use ($uploadsUrl) {
        $img = hnkcms_image_json($s, 'slika', $uploadsUrl, 'alt');
        if ($img !== null) {
            $img['id'] = (int) $s['id'];
        }
        return $img;
    }, $imgs->fetchAll())));

    return $json;
}
