# HNK Kroatien Schwyz — PHP/MySQL CMS backend (staging)

Zamjena za Sanity, modul po modul. **Modul 1: sponzori** je gotov i lokalno
testiran (vidi "Kako je testirano" na dnu). Next.js frontend na Vercelu i
dalje čita iz Sanityja za sve OSTALE tipove — mijenja se samo izvor podataka
za sponzore, i to samo na testnoj grani (vidi `../hnk` repo, grana
`staging/php-sponsors-api-test`).

Ovaj folder **NIJE dio hnk Next.js repozitorija/git historije** — to je
zaseban PHP sistem koji ide na sasvim drugu infrastrukturu (Hostpoint, ne
Vercel). Živi lokalno u ovom checkoutu samo zato što je tako zgodnije za
review; kad odobriš deploy, kopira se na Hostpoint (rsync/SFTP), ne pusha se
na GitHub.

## ⚠️ Nisam mogao deployati — treba mi pristup

Iz ovog (sandbox) okruženja nema izlaznog pristupa portovima 22 (SSH) ni
3306 (MySQL) — samo HTTPS kroz proxy. Testirao sam eksplicitno prije nego
sam počeo pisati kod (sirovi TCP na oba porta je blokiran, nema SSH ključeva
ni ssh-agenta). Znači: **sve što slijedi je pripremljeno i lokalno
provjereno, ali NIJE deployano na api-staging.kroatien-schwyz.ch.**

Za deploy treba jedno od:
- SSH/SFTP pristup Hostpoint nalogu (host, port, korisničko ime, ključ ili
  lozinka) — rsync/scp foldera `public/` u
  `/home/hidapifa/www/api-staging.kroatien-schwyz.ch/`, `config/` jedan nivo
  iznad njega (izvan document-roota), i pokretanje `schema.sql` +
  `bin/create-admin.php` preko SSH shella, ILI
- Ako Hostpoint nalog nema SSH shell pristup (samo FTP) — File Manager ili
  FTP klijent za upload fajlova, i phpMyAdmin (obično dostupan u Hostpoint
  kontrolnoj ploči) za pokretanje `schema.sql` i ručno umetanje admin retka
  (u tom slučaju mi javi pa ti dam gotov `INSERT` s ispravnim hash-om
  lozinke, umjesto CLI skripte).

Reci koje od ovoga imaš (ili riješi kroz Chrome extenziju kako si najavio) pa
nastavljam s pravim deployem i provjerom na stvarnoj poddomeni.

## Struktura

```
hostpoint-cms/
  schema.sql                  # CREATE TABLE sponzori, admin_users
  config/
    config.example.php        # kopirati u config.php na serveru, popuniti
  bin/
    create-admin.php          # CLI: kreira/resetira admin nalog (lozinka se ne šalje preko HTTP-a)
  public/                     # = document root za api-staging.kroatien-schwyz.ch
    .htaccess                 # HTTPS redirect, blokira .sql/.md/.env
    api/
      sponzori.php            # GET javni JSON (lista / ?id=X), samo status=veroeffentlicht
    admin/
      login.php                # korak 1: lozinka
      setup-2fa.php            # prvi put: uparivanje TOTP-a (ručni unos ključa, bez QR-a)
      index.php                 # lista sponzora (uključujući Entwurf)
      sponzor-edit.php          # add/edit forma + upload loga
      sponzor-delete.php
      includes/                 # db.php, auth.php, totp.php, webp.php (.htaccess brani direktan pristup)
      assets/admin.css
    uploads/
      sponzori/                 # generirani WebP (small/medium/large) — javno
        originals/               # netaknuti originali — NIJE javno (.htaccess)
```

## Prvi deploy na Hostpoint (kad pristup bude riješen)

1. Kreirati poddomenu `api-staging.kroatien-schwyz.ch` u Hostpoint panelu
   (ako već nije), document root = `/home/hidapifa/www/api-staging.kroatien-schwyz.ch`.
2. Rsync/upload: sadržaj `public/` → document root te poddomene.
   `config/` folder ide JEDAN NIVO IZNAD document-roota (dakle u
   `/home/hidapifa/www/api-staging.kroatien-schwyz.ch/../config/` odnosno
   gdje god Hostpoint dopušta pristup izvan public_html-a te poddomene —
   ako Hostpoint ne dozvoljava izlazak iznad document-roota za tu
   poddomenu, alternativa je staviti `config/config.php` u sam document
   root ali s `.htaccess` `Require all denied` na tu datoteku — javi mi
   koja je stvarna struktura foldera pa prilagodim putanju u `db.php`.
3. `cp config/config.example.php config/config.php` pa popuniti:
   - `db.pass` → stvarna lozinka baze hidapifa_hnkcms (dogovorena izvan git-a — ne pišemo je ovdje)
   - `db.host` → `hidapifa.mysql.db.internal` (isti hosting)
4. Pokrenuti shemu: `mysql -h hidapifa.mysql.db.hostpoint.ch -u hidapifa_hnkcms -p hidapifa_hnkcms < schema.sql`
   (eksterni host — s lokalnog računala/alata; sa samog servera koristiti
   `hidapifa.mysql.db.internal`).
5. Kreirati admin nalog: `php bin/create-admin.php <username>` (traži
   lozinku interaktivno, min. 12 znakova).
6. Provjeriti CHMOD na `public/uploads/sponzori/` (i `originals/`
   podfolder) — web server mora smjeti pisati (obično 755 sa vlasnikom
   Hostpoint korisnika je dovoljno, ne treba 777).
7. Otvoriti `https://api-staging.kroatien-schwyz.ch/admin/login.php`,
   prijaviti se, postaviti 2FA (ekran će tražiti ručni unos ključa u
   autentikator app — nema QR koda, namjerno, da ne zavisimo o vanjskom
   generatoru).
8. Test: `https://api-staging.kroatien-schwyz.ch/api/sponzori.php` mora
   vratiti `{"sponsors":[]}` (prazna lista dok se ništa ne unese).

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
