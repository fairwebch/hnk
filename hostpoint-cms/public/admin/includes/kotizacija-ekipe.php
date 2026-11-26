<?php
/**
 * Izračun i tekstualni prikaz ukupne kotizacije za ekipnu prijavu, kad
 * događaj ima strukturiranu cijenu po kategoriji (dogadjaji.cijena_aktivni/
 * seniori/djeca — vidi schema.sql) umjesto (ili uz) slobodnog teksta
 * dogadjaji.kotizacija. Dijeli ga api/prijava.php (email) i
 * admin/prijave-dogadjaj.php (lista + CSV) — obje datoteke već dosežu
 * admin/includes/ istim relativnim obrascem kao za db.php.
 */

declare(strict_types=1);

/** Ima li događaj barem jednu konfiguriranu cijenu po kategoriji? */
function hnkcms_ima_strukturiranu_cijenu(array $cijene): bool
{
    foreach ($cijene as $c) {
        if ($c !== null) {
            return true;
        }
    }
    return false;
}

/** "100" za cijele brojeve, "100.50" kad ima decimala — nikad suvišan "100.00". */
function hnkcms_format_chf(float $iznos): string
{
    $s = number_format($iznos, 2, '.', '');
    return preg_replace('/\.00$/', '', $s);
}

/**
 * Interno: raspoređuje odabrane kategorije (kanonski redoslijed Aktivni,
 * Seniori, Djeca) u plaćene ([naziv => iznos]) i besplatne ([naziv, ...]).
 * Dijele ga hnkcms_kotizacija_ekipe() i hnkcms_kotizacija_ekipe_ukupno_kratko().
 */
function hnkcms_kotizacija_ekipe_raspored(array $odabraneKategorije, array $cijene): array
{
    $placeno = [];
    $besplatno = [];
    foreach (['Aktivni', 'Seniori', 'Djeca'] as $kat) {
        if (!in_array($kat, $odabraneKategorije, true)) {
            continue;
        }
        $iznos = (float) ($cijene[$kat] ?? 0.0);
        if ($iznos > 0) {
            $placeno[$kat] = $iznos;
        } else {
            $besplatno[] = $kat;
        }
    }
    return [$placeno, $besplatno];
}

/**
 * $odabraneKategorije: npr. ['Aktivni', 'Djeca'] (iz kategorija_ekipe SET
 * stupca, već razdvojenog na niz). $cijene: ['Aktivni' => 100.0, 'Seniori'
 * => 100.0, 'Djeca' => null] (iz dogadjaji.cijena_aktivni/seniori/djeca).
 * NULL i 0.0 tretiraju se jednako — obje znače "besplatno za tu kategoriju".
 *
 * Vraća npr. "Aktivni CHF 100 + Seniori CHF 100 = CHF 200 (Djeca besplatno)",
 * "Aktivni CHF 100" (jedna plaćena, ništa besplatno), ili "Besplatno" (sve
 * odabrane kategorije besplatne).
 */
function hnkcms_kotizacija_ekipe(array $odabraneKategorije, array $cijene): string
{
    [$placeno, $besplatno] = hnkcms_kotizacija_ekipe_raspored($odabraneKategorije, $cijene);

    if (!$placeno) {
        return 'Besplatno';
    }

    if (count($placeno) === 1 && !$besplatno) {
        $naziv = array_key_first($placeno);
        return "{$naziv} CHF " . hnkcms_format_chf($placeno[$naziv]);
    }

    $dijelovi = [];
    $ukupno = 0.0;
    foreach ($placeno as $naziv => $iznos) {
        $dijelovi[] = "{$naziv} CHF " . hnkcms_format_chf($iznos);
        $ukupno += $iznos;
    }
    $prikaz = implode(' + ', $dijelovi) . ' = CHF ' . hnkcms_format_chf($ukupno);
    if ($besplatno) {
        $prikaz .= ' (' . implode(', ', $besplatno) . ' besplatno)';
    }
    return $prikaz;
}

/**
 * Kratak "CHF X" ukupni iznos za drugu (skraćenu) rečenicu u potvrdnom
 * emailu, ispod $details tablice koja već prikazuje puni raščlan (vidi
 * hnkcms_kotizacija_ekipe) — ili null kad ta rečenica ne bi dodala ništa
 * korisno, nego bi samo doslovno ponovila tablicu:
 * - nijedna odabrana kategorija nije plaćena (sve besplatno) — nema što
 *   platiti, "informacije o plaćanju" nisu relevantne;
 * - točno jedna plaćena kategorija i nijedna besplatna — tablica već piše
 *   npr. "Aktivni CHF 100" bez zbrajanja, pa bi "Ukupno CHF 100" ispod bilo
 *   isti broj dvaput.
 * U preostalim slučajevima (2+ plaćene, ili 1 plaćena + barem 1 besplatna)
 * tablica već prikazuje zbroj "A + B = CHF X", pa kratka rečenica samo
 * ističe krajnji iznos bez ponavljanja cijelog raščlana.
 */
function hnkcms_kotizacija_ekipe_ukupno_kratko(array $odabraneKategorije, array $cijene): ?string
{
    [$placeno, $besplatno] = hnkcms_kotizacija_ekipe_raspored($odabraneKategorije, $cijene);
    if (!$placeno || (count($placeno) === 1 && !$besplatno)) {
        return null;
    }
    return 'CHF ' . hnkcms_format_chf(array_sum($placeno));
}
