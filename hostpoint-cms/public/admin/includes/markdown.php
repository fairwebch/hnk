<?php
/**
 * Minimalni Markdown -> HTML konverter (stranice, momčadi.opis, novosti) —
 * svjesno pojednostavljena zamjena za Sanity Portable Text (rich text).
 * Podržava podskup Sanity "blockContent" sheme: paragraf, ## / ### naslovi,
 * > citat, - / 1. liste, **bold**, *italic*, [link](url) (samo
 * http(s)/mailto/tel) i sliku u zasebnom redu `![alt](url)` -> <figure>
 * (isti izlaz kao PortableText `image` član; url samo http(s) ili /uploads/).
 * Backslash escape-uje marker na početku reda (`1\.` ostaje običan pasus,
 * ne numerirana lista — stvarni sadržaj novosti ima pasuse "1. NK ...").
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

        // Slika u zasebnom redu: ![alt](url) -> <figure> (kao Sanity image blok).
        if (preg_match('/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/', $line, $m)) {
            $flushParagraph();
            $html .= hnkcms_md_figure($m[1], $m[2]);
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

/** <figure> za sliku u tekstu; url mora biti http(s) ili relativan /uploads/… — inače literalni tekst. */
function hnkcms_md_figure(string $alt, string $url): string
{
    if (!preg_match('#^(https?://|/uploads/)#i', $url)) {
        return '<p>' . hnkcms_md_inline("![{$alt}]({$url})") . '</p>';
    }
    $altEsc = htmlspecialchars($alt, ENT_QUOTES, 'UTF-8');
    $html = '<figure><img src="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" alt="' . $altEsc . '" loading="lazy">';
    if ($alt !== '') {
        $html .= '<figcaption>' . $altEsc . '</figcaption>';
    }
    return $html . '</figure>';
}

/**
 * Inline formatiranje unutar jednog reda: escape prvo, pa **bold**, *italic*,
 * [link](url). Backslash ispred . * [ ] # > - ! čuva znak literalno (placeholder
 * dok traju regexi, da npr. `\*` ne završi kao kurziv).
 */
function hnkcms_md_inline(string $text): string
{
    $literals = [];
    $text = preg_replace_callback('/\\\\([.*\[\]#>\-!])/', function (array $m) use (&$literals): string {
        $literals[] = $m[1];
        return "\x00" . (count($literals) - 1) . "\x00";
    }, $text) ?? $text;

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

    if ($literals) {
        $escaped = preg_replace_callback('/\x00(\d+)\x00/', fn(array $m) => htmlspecialchars($literals[(int) $m[1]], ENT_QUOTES, 'UTF-8'), $escaped) ?? $escaped;
    }

    return $escaped;
}
