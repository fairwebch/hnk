# HNK Kroatien Schwyz — PHP/MySQL CMS backend (staging)

Zamjena za Sanity, modul po modul. **Modul 1: sponzori**, **Modul 2: clan_uprave**
(uprava), **Modul 3: stranice** (kontakt, postani-clan, impressum,
datenschutzerklarung) i **Modul 4: momcadi** (Aktivni, Seniori, Juniori — s
rosterom, popisom imena i galerijom) su gotovi i live na stagingu. Next.js frontend na
Vercelu i dalje čita iz Sanityja za sve OSTALE tipove — mijenja se samo
izvor podataka za te module, i to samo na testnoj grani (vidi `../hnk`
repo, grana `staging/php-sponsors-api-test`).

Ovaj folder JEST dio hnk Next.js repozitorija (isti git checkout, radi lakšeg
review-a), ali je funkcionalno zaseban PHP sistem koji ide na sasvim drugu
infrastrukturu (Hostpoint, ne Vercel) — deploy ide preko `deploy.sh` (rsync/SSH),
ne preko Vercela.

## Deploy: `./deploy.sh staging` (rsync preko SSH)

SSH pristup je potvrđen i radi (ključ u `authorized_keys`, bez lozinke) —
`ssh hidapifa@sl60.web.hostpoint.ch`. Vidi [deploy.sh](deploy.sh) za pravila
(git-clean provjera, nikad `--delete`, ograničeno na
`www/api-staging.kroatien-schwyz.ch/`). Prvi deploy Modula 1 (sponzori) je
napravljen ručno kroz File Manager + phpMyAdmin dok SSH pristup još nije bio
riješen — taj redoslijed koraka je ostavljen ispod kao istorijski zapis. Od
Modula 2 (clan_uprave) nadalje: `./deploy.sh staging --dry-run` pa
`./deploy.sh staging` za kod; nova tablica/seed podaci idu preko SSH-a
(`mysql` klijent + rsync generiranih WebP fajlova) — vidi
`bin/seed-real-*.php` skripte i `schema.sql`.

## Struktura

```
hostpoint-cms/
  deploy.sh                   # rsync preko SSH -> www/api-staging.kroatien-schwyz.ch/ (vidi deploy.sh za pravila)
  schema.sql                  # CREATE TABLE sponzori, clan_uprave, stranice, momcadi (+3 child), admin_users
  config/
    config.example.php        # kopirati u config.php na serveru, popuniti
  bin/
    create-admin.php          # CLI: kreira/resetira admin nalog (radi preko SSH-a)
    seed-real-sponsors.php    # jednokratna migracija Modul 1 (Sanity -> WebP/SQL)
    seed-real-clan-uprave.php # jednokratna migracija Modul 2 (Sanity -> WebP/SQL)
    seed-real-stranice.php    # jednokratna migracija Modul 3 (Sanity PT -> Markdown/SQL)
    seed-real-momcadi.php     # jednokratna migracija Modul 4 (Sanity -> WebP wide/SQL)
  public/                     # = document root za api-staging.kroatien-schwyz.ch
    .htaccess                 # HTTPS redirect, blokira .sql/.md/.env
    api/
      sponzori.php            # GET javni JSON (lista / ?id=X), samo status=veroeffentlicht
      clan-uprave.php          # GET javni JSON (lista / ?id=X), samo status=veroeffentlicht
      stranica.php              # GET javni JSON (lista / ?slug=X / ?id=X), body već HTML (iz Markdowna)
      momcadi.php               # GET lista (lagani oblik + brojIgraca) / ?slug=X (puni: igraci, trener, gallery)
    admin/
      login.php                # korak 1: lozinka
      setup-2fa.php            # prvi put: uparivanje TOTP-a (ručni unos ključa, bez QR-a)
      index.php                 # lista sponzora (uključujući Entwurf)
      sponzor-edit.php          # add/edit forma + upload loga
      sponzor-delete.php
      uprava.php                 # lista članova uprave (uključujući Entwurf)
      uprava-edit.php            # add/edit forma + upload slike (neobavezna)
      uprava-delete.php
      stranice.php               # lista stranica (uključujući Entwurf)
      stranica-edit.php          # add/edit forma, textarea + Markdown cheat-sheet
      stranica-delete.php
      momcadi.php                # lista momčadi s brojevima igrača/redova/slika
      momcad-edit.php            # tim: naziv, liga, termin, opis (Markdown), cover/grupna/trener slike
      momcad-delete.php          # briše i sve child datoteke (FK cascade briše retke)
      momcad-sastav.php          # hub po timu: roster + popis imena + galerija (višestruki upload)
      momcad-igrac-edit.php / -delete.php
      momcad-popis-edit.php / -delete.php
      momcad-galerija-upload.php / -edit.php / -delete.php
      includes/                 # db.php, auth.php, totp.php, cors.php, webp.php, markdown.php, layout.php
                                 # (webp.php dijeljen preko modula: process()/delete() prime
                                 # $filePrefix/$columnPrefix/$widths; markdown.php je Portable Text
                                 # zamjena; layout.php = header + nav tabovi (HNKCMS_NAV) za sve
                                 # admin stranice; .htaccess brani direktan pristup)
      assets/admin.css
    uploads/
      sponzori/                 # generirani WebP (small/medium/large) — javno
        originals/               # netaknuti originali — NIJE javno (.htaccess)
      clan-uprave/               # generirani WebP (small/medium/large) — javno, slika neobavezna
        originals/               # netaknuti originali — NIJE javno (.htaccess)
      momcadi/                   # cover-/grupna-/trener-/igrac-/galerija-<id>-* WebP — javno
        originals/               # netaknuti originali — NIJE javno (.htaccess)
```

## Prvi deploy na Hostpoint — redoslijed (File Manager + phpMyAdmin)

Detaljne upute s točnim putanjama su u chat odgovoru kad je ovo pripremljeno;
sažetak radi budućih izmjena/re-deploya:

1. **phpMyAdmin → `schema.sql`** (tablice `sponzori`, `admin_users`) — MORA
   biti prvo, `admin-user-insert.sql` referencira `admin_users`.
2. **phpMyAdmin → `deploy/admin-user-insert.sql`** — kreira admin nalog.
   TOTP se namjerno NE postavlja ovdje (vidi komentar u toj datoteci) —
   prva prijava kroz `/admin/login.php` sama provede kroz uparivanje 2FA.
3. **File Manager → upload `deploy/api-staging-public.zip`** u document
   root poddomene `api-staging.kroatien-schwyz.ch`, raspakirati IN-PLACE
   (sadržaj zipa je direktno `public/*`, ne dodatni obavijajući folder).
4. **File Manager → upload `deploy/config.php`** JEDAN NIVO IZNAD
   document-roota te poddomene (ne u njega!) — kod Hostpointa to je
   obično `www/config/config.php` (sibling folder pored
   `www/api-staging.kroatien-schwyz.ch/`, `www/hidapifa.myhostpoint.ch/`,
   `www/tvojdj.ch/`) — tako matcha relativnu putanju već ukodiranu u
   `admin/includes/db.php` (`../../../config/config.php`), bez izmjene
   koda. Ako File Manager ne dozvoljava tu lokaciju, javi pa mijenjam putanju.
5. Provjeriti CHMOD na `uploads/sponzori/` (i `originals/` podfolder) —
   web server mora smjeti pisati (755 s vlasništvom Hostpoint korisnika je
   dovoljno, ne treba 777).
6. Test: `https://api-staging.kroatien-schwyz.ch/api/sponzori.php` mora
   vratiti `{"sponsors":[]}`.
7. `https://api-staging.kroatien-schwyz.ch/admin/login.php` → prijava →
   postavljanje 2FA (ručni unos ključa u autentikator app).

## Modul 2: clan_uprave (uprava) — deploy preko SSH-a

Od ovog modula nadalje deploy ide preko SSH umjesto File Managera:

1. `mysql --defaults-extra-file=... hidapifa_hnkcms < schema.sql` preko SSH-a
   (idempotentno — sigurno se re-runa i za buduće module).
2. `php bin/seed-real-clan-uprave.php <src> <out>` — pokrenuto DIREKTNO na
   Hostpoint serveru preko SSH-a (PHP 8.3 + GD tamo, isti pipeline kao
   `includes/webp.php`), ne lokalno — mrtvo jednostavnije nego prebacivati
   generirane WebP fajlove naprijed-nazad.
3. Generirani `<out>/uploads/*` premješteni u `uploads/clan-uprave/` na
   serveru, `<out>/clan-uprave-insert.sql` pokrenut preko istog mysql klijenta.
4. `./deploy.sh staging --dry-run` pa `./deploy.sh staging` za kod
   (`api/clan-uprave.php`, `admin/uprava*.php`, `includes/cors.php`,
   generalizovani `includes/webp.php`).

Svi podaci su stvarni (13 članova uprave povučenih preko GROQ javnog read
API-ja, 8 sa stvarnim fotografijama sa Sanity CDN-a) — ne test placeholderi.

## Modul 3: stranice (CMS stranice) — Portable Text -> Markdown

Sanity `stranica.body` je Portable Text (rich text: naslovi, liste, bold/
italic, linkovi). Umjesto punog rich-text editora u adminu, body se čuva
kao **Markdown izvor** (`sadrzaj_hr`/`sadrzaj_de` kolone) i konvertuje u
HTML pri svakom čitanju (`includes/markdown.php`, bez Composer zavisnosti
— isti princip kao TOTP). Podržan podskup odgovara TAČNO onome što stvarni
sadržaj koristi: paragraf (prazan red = novi pasus, Enter unutar pasusa =
`<br>`), `##`/`###` naslovi, `> citat`, `- `/`1. ` liste (tolerantno na
prazne redove između stavki), `**bold**`, `*italic*`, `[link](url)`
(http(s)/mailto/tel). Bez slika u body-ju — stvarni sadržaj ih ne koristi.
XSS-sigurno po konstrukciji: tekst prolazi kroz `htmlspecialchars()` PRIJE
umetanja bilo kojeg taga, pa admin ne može ubaciti proizvoljan HTML.

Frontend (`lib/stranicaApi.ts`, `components/ui/HtmlContent.tsx`) prikazuje
gotov HTML iz API-ja preko `dangerouslySetInnerHTML` — nema Portable Text
parsiranja na Next.js strani za ovaj modul. Nove `.cms-html` CSS klase u
`app/globals.css` repliciraju istu tipografiju kao
`components/ui/PortableText.tsx` (isti Tailwind klase po elementu), pa
vizuelni rezultat ostaje identičan.

Deploy: isti SSH obrazac kao Modul 2 (schema.sql pa insert SQL preko mysql
klijenta, nema slika pa nema WebP koraka), `./deploy.sh staging` za kod.
4 stvarne stranice — kontakt, postani-clan, impressum, datenschutzerklarung
— povučene preko GROQ javnog read API-ja (Portable Text ručno prepisan u
Markdown, nema automatskog konvertera, jednokratan posao).

## Modul 4: momcadi — prvi parent/child modul

Sanity `momcad` ima tri inline niza (igraci[], popisImena[], gallery[]) i
inline objekt trener — u MySQL-u to su child tablice `momcad_igraci`,
`momcad_popis_imena`, `momcad_galerija` (FK `ON DELETE CASCADE`; datoteke
child redaka `momcad-delete.php` briše eksplicitno prije retka) i
`trener_*` kolone na `momcadi`. Nema tipa "kategorija": svaki nivo je redak.

**Roster, dva načina (isto kao Sanity/frontend):** strukturirani
`momcad_igraci` (ime, prezime, broj, pozicija enum golman/obrana/vezni/napad,
slika, redoslijed — Sanity ga nema, relaciona tablica ga treba) i legacy
`momcad_popis_imena` (oznaka reda _hr/_de + zarezom odvojena imena).
Frontend zadržava `rosterMode = igraci.length > 0`. Provjereno: nema hibrida
ni eksternog izvora igrača; sve 3 stvarne momčadi danas koriste SAMO popis
imena, pa seed prenosi točno to (igraci/trener/liga/termin/cover/gallery/
description su prazni i ovdje i u Sanityju). `pozicija` se vraća sirova —
HR/DE labele ostaju u Next.js `messages/*.json` (`teams.pozicije.*`), kao i danas.

**Slike:** `WebpPipeline::process()` sada prima opcione širine.
`WIDTHS_WIDE` (480/1200/1920) za cover, grupnu i galeriju (hero 100vw,
grupna 1200px, lightbox); portreti igrača/trenera ostaju na 240/480/800.
Grupne fotografije u Sanityju su 2000×1125 JPEG (CDN URL kaže .webp, bajtovi
su JPEG — seed detektira MIME). Upload galerije prima više datoteka odjednom.

**Admin:** `momcadi.php` → `momcad-edit.php` (tim) → `momcad-sastav.php`
(igrači / popis imena / galerija na jednoj stranici po timu). Header + nav
tabovi su izdvojeni u `includes/layout.php` (`HNKCMS_NAV`) — postojeće
stranice prebačene bez promjene izgleda.

## Sigurnosne odluke (ukratko, za review)

- **Nema Composer paketa.** TOTP je RFC 6238 implementacija u čistom PHP-u
  (`includes/totp.php`) — testirano protiv nezavisne Python referentne
  implementacije (isti HMAC-SHA1/base32, identičan kod za isti secret i
  timestep). Razlog: ne znamo unaprijed ima li Hostpoint shell/composer, pa
  je nula-zavisnosti sigurnija pretpostavka.
- **2FA bez QR koda.** Ručni unos base32 ključa u autentikator app — izbjegava
  vanjski QR-generator servis ili dodatnu PHP biblioteku za crtanje QR-a.
  Ako je QR ipak poželjan, može se dodati čisto lokalno (npr. `chillerlan/php-qrcode`
  preko Composera) — javi ako Hostpoint ima composer/shell.
- **Lockout:** 5 pogrešnih pokušaja (na bilo kojem koraku, lozinka ili TOTP)
  → 15 min zaključavanje naloga. Bez zasebne tablice, polja su na
  `admin_users`.
- **CSRF token** na svim POST formama (login, 2FA setup, sponzor add/edit/delete).
- **Originalni upload nikad nije javan** — `originals/` ima `.htaccess Require
  all denied`; javno su samo generirane WebP verzije (ili sanitizirani SVG).
- **SVG upload se sanitizira** (uklanja `<script>`, `on*` handlere, `<!DOCTYPE>`/`<!ENTITY>`)
  prije spremanja u javno dostupni folder — inline SVG može nositi JS, pa se
  ne servira sirov korisnički upload.
- **`uploads/` folder ne izvršava PHP** (`.htaccess`) — dodatna zaštita za
  slučaj da validacija tipa datoteke ikad zakaže.
- **Javni API (`api/sponzori.php`) nikad ne vraća `status='entwurf'`** —
  nacrti su vidljivi isključivo kroz admin panel.

## WebP pipeline

GD (ne Imagick) — potvrđeno dostupan i s WebP podrškom u ovom sandboxu, a
gotovo je univerzalan na shared hostingu. 3 širine: **240 / 480 / 800px**
(srcset 1x/2x/~3.3x za logo koji se na sajtu renderira ~220×110px), kvaliteta
**82**, original se čuva netaknut u `originals/`. Brojevi širina nisu kopija
iz HSL projekta (nisam imao pristup tom repou u ovoj sesiji) — birani su za
stvarnu veličinu renderiranja sponzorskih logotipa na `/sponzoring` stranici;
lako se mijenjaju u `includes/webp.php` (`WebpPipeline::WIDTHS`) ako HSL
obrazac koristi druge brojeve.

SVG upload se ne rasterizira (nema smisla za vektor) — sanitizirana SVG
datoteka se sprema jednom, sve tri "veličine" u bazi pokazuju na nju.

## Kako je testirano (lokalno, u ovoj sesiji)

- **MariaDB 10.11** instaliran lokalno (ista verzija kao Hostpoint) —
  `schema.sql` učitan bez grešaka, struktura tablica provjerena `DESCRIBE`.
- **TOTP** unakrsno provjeren protiv nezavisne Python implementacije
  (isti secret + isti 30s timestep → identičan 6-znamenkasti kod).
- **Cijeli admin flow** (login → 2FA setup → login sa 2FA → CRUD sponzora →
  logout) proveden preko PHP built-in servera + curl sesije protiv lokalne
  MariaDB baze — vidi test log poslan uz izvještaj.
- **`api/sponzori.php`** provjeren da vraća točan JSON oblik i da Entwurf
  redak izostaje iz javnog odgovora.
- Nije testirano: stvarni Hostpoint hosting environment (permissions,
  PHP verzija/moduli na tom serveru, stvarni SSL/.htaccess ponašanje) — to
  se može potvrditi tek nakon pravog deploya.
