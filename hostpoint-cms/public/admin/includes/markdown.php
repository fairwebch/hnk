<?php
/**
 * Minimalni Markdown -> HTML konverter za "stranice" modul — svjesno
 * pojednostavljena zamjena za Sanity Portable Text (rich text). Podržava
 * TAČNO onaj podskup koji stvarni sadržaj koristi (vidi Sanity
 * "blockContent" shemu): paragraf, ## / ### naslovi, > citat, - / 1. liste,
 * **bold**, *italic*, [link](url) (samo http(s)/mailto/tel). Bez slika u
 * body-ju — nema ih u stvarnom sadržaju, pa nema smisla dodavati podršku.
 *
 * Nema Composer zavisnosti (isti princip kao TOTP u includes/totp.php) —
 * ulazni tekst je uvijek admin-only (iza login/2FA), ali ipak prolazi kroz
 * htmlspecialchars() PRIJE bilo kakvog umetanja tagova, pa je XSS-siguran
 * po konstrukciji (jedini tagovi koji ikad završe u izlazu su oni koje ova
 * funkcija sama doda).
 *
 * Konvencija razmaka: prazan red = novi pasus; jedan Enter unutar pasusa =
 * <br> (jednostavnije za ne-tehničkog admina od standardnog Markdown
 * "soft wrap", i odgovara stvarnom sadržaju gdje adresa/telefon idu u
 * odvojenim redovima unutar istog pasusa).
 */

declare(strict_types=1);

function hnkcms_markdown_to_html(?string $md): string
{
    if ($md === null || trim($md) === '') {
        return '';
    }

    $lines = preg_split('/\r\n|\r|\n/', $md);
    $n = count($lines);
    $html = '';
    $paragraphBuf = [];

    $flushParagraph = function () use (&$paragraphBuf, &$html): void {
        if (!$paragraphBuf) {
            return;
        }
        $parts = array_map(
            fn($line) => hnkcms_md_inline(trim($line)),
            $paragraphBuf
        );
        $html .= '<p>' . implode('<br>', $parts) . '</p>';
        $paragraphBuf = [];
    };

    $i = 0;
    while ($i < $n) {
        $line = rtrim($lines[$i]);

        if (trim($line) === '') {
            $flushParagraph();
            $i++;
            continue;
        }

        if (preg_match('/^### (.+)/', $line, $m)) {
            $flushParagraph();
            $html .= '<h3>' . hnkcms_md_inline(trim($m[1])) . '</h3>';
            $i++;
            continue;
        }
        if (preg_match('/^## (.+)/', $line, $m)) {
            $flushParagraph();
            $html .= '<h2>' . hnkcms_md_inline(trim($m[1])) . '</h2>';
            $i++;
            continue;
        }

        if (preg_match('/^> ?(.*)/', $line, $m)) {
            $flushParagraph();
            $quoteLines = [$m[1]];
            $i++;
            while ($i < $n && preg_match('/^> ?(.*)/', rtrim($lines[$i]), $mm)) {
                $quoteLines[] = $mm[1];
                $i++;
            }
            $html .= '<blockquote>' . implode('<br>', array_map(fn($l) => hnkcms_md_inline(trim($l)), $quoteLines)) . '</blockquote>';
            continue;
        }

        if (preg_match('/^[-*] (.+)/', $line)) {
            $flushParagraph();
            [$items, $i] = hnkcms_md_collect_list($lines, $i, '/^[-*] (.+)/');
            $html .= '<ul>' . implode('', array_map(fn($it) => '<li>' . hnkcms_md_inline(trim($it)) . '</li>', $items)) . '</ul>';
            continue;
        }

        if (preg_match('/^\d+\. (.+)/', $line)) {
            $flushParagraph();
            [$items, $i] = hnkcms_md_collect_list($lines, $i, '/^\d+\. (.+)/');
            $html .= '<ol>' . implode('', array_map(fn($it) => '<li>' . hnkcms_md_inline(trim($it)) . '</li>', $items)) . '</ol>';
            continue;
        }

        $paragraphBuf[] = $line;
        $i++;
    }
    $flushParagraph();

    return $html;
}

/**
 * Skuplja uzastopne stavke liste koje odgovaraju $pattern, tolerišući
 * pojedinačan prazan red između stavki (labava lista) — ali se zaustavlja
 * čim red nakon praznog reda NIJE stavka iste liste (npr. novi pasus).
 * @return array{0: string[], 1: int} [stavke, novi indeks]
 */
function hnkcms_md_collect_list(array $lines, int $i, string $pattern): array
{
    $n = count($lines);
    $items = [];
    while ($i < $n) {
        $line = rtrim($lines[$i]);
        if (preg_match($pattern, $line, $m)) {
            $items[] = $m[1];
            $i++;
            continue;
        }
        if (trim($line) === '') {
            $j = $i + 1;
            while ($j < $n && trim(rtrim($lines[$j])) === '') {
                $j++;
            }
            if ($j < $n && preg_match($pattern, rtrim($lines[$j]))) {
                $i = $j;
                continue;
            }
        }
        break;
    }
    return [$items, $i];
}

/** Inline formatiranje unutar jednog reda: escape prvo, pa **bold**, *italic*, [link](url). */
function hnkcms_md_inline(string $text): string
{
    $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');

    // [tekst](url) — samo http(s)/mailto/tel, inače ostaje kao literalni tekst.
    $escaped = preg_replace_callback('/\[([^\]]+)\]\(([^)]+)\)/', function (array $m): string {
        $url = $m[2];
        if (!preg_match('#^(https?://|mailto:|tel:)#i', $url)) {
            return $m[0];
        }
        return '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" target="_blank" rel="noopener noreferrer">' . $m[1] . '</a>';
    }, $escaped) ?? $escaped;

    $escaped = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $escaped) ?? $escaped;
    $escaped = preg_replace('/\*(.+?)\*/', '<em>$1</em>', $escaped) ?? $escaped;

    return $escaped;
}
