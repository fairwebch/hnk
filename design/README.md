# Handoff: HNK Kroatien Schwyz — novi sajt (Next.js + Sanity)

## Pregled
Kompletan redizajn sajta kroatien-schwyz.ch: statični Next.js sajt (App Router, TypeScript, Tailwind) sa Sanity CMS-om (Studio na `/studio`), dvojezičan HR (default) / DE-CH preko next-intl. Ovaj paket sadrži hi-fi dizajn svih stranica + specifikaciju za implementaciju. Originalni brief naručioca je u `BRIEF.md` — **on je izvor istine za tehnologije, šeme, migraciju i deploy korake**.

## O dizajn fajlovima
Fajlovi u ovom paketu (`*.dc.html`) su **dizajn-reference napravljene u HTML-u** — prikazuju izgled i ponašanje, NISU produkcijski kod. Zadatak je **rekreirati ove dizajne u Next.js + Tailwind okruženju** prema briefu. Otvorite ih u browseru; sav stil je inline (lako čitljive vrijednosti). `Header.dc.html` i `Footer.dc.html` su izdvojene komponente; glavni fajl sadrži sve ekrane na jednom platnu.

## Vjernost
**Hi-fi.** Boje, tipografija, spacing i copy su finalni prijedlog — rekreirati piksel-vjerno u Tailwindu.

## Dizajn tokeni
- **Boje:** navy `#0D1B33` (primarna tamna), crvena `#D8232F` (akcent/CTA; hover `#B4121E`), najtamnija `#070E1D` (topbar), footer `#0A1428`, pozadina `#F5F6FA`, linije `#E4E8F0`, tekst `#33405C`–`#55617A`, muted `#8A93A8`, chip pozadina `#FBEAEC`, tamne kartice `#122444`/`#16274A`, bordure na navy `#22345C`/`#2C3D60`
- **Fontovi (Google Fonts):** naslovi `Barlow Condensed` italic 800 uppercase (H1 94/64/46/40px, kartice 20–24px); tekst `Barlow` 400–600 (14–17px); kickeri: Barlow Condensed 700, 11–13px, letter-spacing .18–.24em, crveni
- **Šahovnica (potpis brenda):** `background: repeating-conic-gradient(#D8232F 0% 25%, #FFF 0% 50%) 0 0 / 16px 16px` — 8px traka ispod page headera, logo kvadrat, akcenti
- **Dugmad:** kontejner `skewX(-8deg)`, sadržaj `skewX(8deg)`; primarna crvena, sekundarna outline 2px; label Barlow Condensed 800, ls .12em, uppercase
- **Kartice:** bijele, border 1px `#E4E8F0`, **bez border-radiusa** (oštri uglovi svuda), hover: `translateY(-4px)` + shadow + crveni border
- **Page header (podstranice):** navy blok, crveni kicker + italic naslov + breadcrumb desno, pa šahovnica traka

## Ekrani (u glavnom .dc.html fajlu, odozgo nadolje)
1. **Početna `/`** — hero (navy, radial crveni glow, ghost "1995", slika s diagonalnim clip-path + crveni offset), statistika (4 ćelije, preklapa hero za -62px), novosti (3 kartice), momčadi (navy sekcija, 3 kartice s ghost brojevima), galerija teaser (2 široke kartice s overlay gradijentom), crveni CTA banner "Postani dio kluba", partneri strip, footer
2. **Novosti `/novosti`** — filter chipovi po kategoriji (Sve/Eventi/Novosti/Skupština/Sport), grid 3 kolone, paginacija
3. **Novost `/novosti/[slug]`** — sadržaj max-width 840px, chip kategorije + datum, info box (border-left 4px crven) za datum/vrijeme/lokaciju/prijavu, share dugmad, povezane objave (3)
4. **Uprava `/uprava`** — grid 4 kolone; kartica: avatar krug s inicijalima na svijetlom gradijentu, ime, funkcija (crveni caps), telefon. *Imena su placeholderi!*
5. **Momčadi `/momcadi`** — 3 horizontalne kartice (foto placeholder 500px | tekst); badge za Juniore "U12 · U16"
6. **Momčad `/momcadi/[slug]`** — header s badge-om, opis, info chipovi, galerija grid 4 kolone
7. **Galerija `/galerija`** — grid 2×2, overlay kartice s kategorijom/brojem/datumom
8. **Galerija `/galerija/[slug]` + lightbox** — grid 4 kolone; lightbox: overlay `rgba(7,11,22,.9)`, strelice u krugovima, brojač "12 / 48", × gore desno
9. **Sponzoring `/sponzoring`** — 3 paketa (Basic bijeli, Standard bijeli s navy borderom, Premium navy s crvenim borderom + badge "NAJPOPULARNIJI"), grid sponzora s paket badge-ovima
10. **Postani član `/postani-clan`** — benefiti s ✓ + tamna kartica s formom (mailto)
11. **Kontakt `/kontakt`** — 3 info kartice, forma (mailto na info@kroatien-schwyz.ch), map placeholder (u produkciji: Google Maps embed za Igralište Widmen, 6436 Muotathal)
12. **Mobilni (390px):** početna, hamburger meni (fullscreen navy overlay, numerisane stavke, HR/DE toggle, socials), novosti, članak
13. **CMS stanja:** prazne novosti/galerija (dashed kartica "…uskoro stižu"), 2 sponzora + dashed "Vaš logo ovdje", DE početna, DE ruta za članak koji postoji samo na HR (banner "Dieser Beitrag ist zurzeit nur auf Kroatisch verfügbar" + link na HR verziju)

## Interakcije
- Header: sticky preporučen; aktivna stavka = crveni border-bottom 3px; jezički switcher (pill HR|DE) vidljiv na svim breakpointima; "Učlani se" CTA u headeru
- Mobilni: hamburger → fullscreen overlay meni; sve tap mete ≥44px
- Kartice novosti/galerija/momčadi: hover lift + crveni border; cijela kartica je link
- Lightbox: strelice, ESC/× zatvaranje, brojač
- Forme: bez backenda — mailto: na info@kroatien-schwyz.ch
- Prazna stanja obavezna za svaku kolekciju (vidi ekrane 13)

## Višejezičnost
- Rute `/hr/...` (default) i `/de/...`; language switcher u headeru
- UI stringovi kroz next-intl (`messages/hr.json`, `messages/de.json`) — prevodi za nav/dugmad su u `Header.dc.html`/`Footer.dc.html` logici (hr/de rječnici)
- Sanity polja lokalizovana (hr/de); ako DE ne postoji → prikaži HR sadržaj s banner-om (ekran 13), **ne izmišljati prevode**
- Švicarski njemački pravopis: „Fussball", ne „Fußball"

## Sanity šema + migracija + deploy
Kompletno u `BRIEF.md` (novost, clanUprave, momcad, sponzor, galerija, dogadjaj, stranica; WP REST migracija sa kroatien-schwyz.ch/wp-json/wp/v2/; GitHub + Vercel deploy koraci). Stranica **Događaji `/dogadjaji`** nema poseban mock — koristiti layout Novosti (kartice s datumom/lokacijom).

## Sadržaj: stvarno vs. placeholder
**Stvarno (sa starog sajta):** naslovi i datumi svih 6 novosti, slike (WP URL-ovi u dizajnu — migrirati u Sanity Assets), partneri (Croaticum, HSL AG, PlanA, TML Personal, Autocenter Goldau, Fakat.ch, Noisia, Masada Swiss), kontakt (+41 79 279 72 32, info@kroatien-schwyz.ch), Facebook/Instagram/WhatsApp, godina osnutka 1995.
**Placeholder (ručni unos kroz Studio):** imena/telefoni uprave, sadržaj paketa sponzorstva i njihove dodjele partnerima, excerpt/tijelo članaka (datumi skupštine 2026 u mocku su primjer!), benefiti članstva, opisi momčadi, brojevi fotografija u galerijama, statistika "19 turnira / 8 partnera" (provjeriti s klubom), adresa igrališta (Widmen, Muotathal — provjeriti).

## Događaji (dopuna šeme "dogadjaj" — VAŽNO, klub živi od evenata)
Prošireni fieldovi: naziv, slug, **kategorija** (Turnir / Zabava / Izlet / Skupština), **datumPocetak** (datetime), **datumKraj** (datetime, opciono — fallback na početak), lokacija, opis, naslovna slika, **cijena/kotizacija** (string, opciono), **prijavaLink** (URL, opciono), **kapacitet** (string, opciono), **program** (niz objekata {vrijeme, opis}), **sponzorEventa** (referenca na sponzor, opciono), **galerija** (referenca na galerija — za arhivu).

Logika prikaza:
- **Nadolazeći** = `datumKraj ?? datumPocetak >= now`, sortirano uzlazno; prvi = "sljedeći događaj"
- **Traka "Sljedeći događaj"** na početnoj, odmah ispod statistike: naziv, datum, lokacija, countdown (dani/sati/min — računa se client-side), CTA "Prijavi se" (HR) / "Anmelden" (DE)
- **Sekcija "Nadolazeći događaji"** na početnoj (3 kartice s datum-pločicom), iznad novosti; mobilni: traka + 2 kompaktna reda
- **/dogadjaji**: featured kartica sljedećeg (countdown + slika), lista ostalih termina, arhiva prošlih s linkom na povezanu galeriju
- **/dogadjaji/[slug]**: opis, program dana, sponzor događaja, info kartica (početak/kraj/lokacija/kotizacija/kapacitet) + CTA na prijavaLink
- Prazno stanje: "Trenutno nema nadolazećih događaja" + link na arhivu
- Prošli eventi se NE brišu — automatski idu u arhivu

Stvarni termini (u dizajnu, potvrdio klub): 28.08.2026 Izlet u Europapark · 21.11.2026 Malonogometni turnir · 06.02.2027 Zabavna večer · 27.02.2027 Turnir u Prstenu · 13.06.2027 Godišnja skupština. **Placeholder:** lokacije "uskoro", kotizacija, kapacitet "16 ekipa", program dana, sponzor eventa.

## Fajlovi
- `HNK Kroatien Schwyz – Dizajn sajta.dc.html` — svi ekrani (desktop 1440, mobilni 390, stanja)
- `Header.dc.html` — header (desktop + mobilni, HR/DE, aktivna stavka)
- `Footer.dc.html` — footer (desktop + mobilni, HR/DE)
- `BRIEF.md` — originalni brief: tehnologije, šeme, migracija, redoslijed izvršavanja
