-- HNK Kroatien Schwyz — PHP+MySQL CMS backend
-- Modul 1: sponzori, Modul 2: clan_uprave, Modul 3: stranice, Modul 4: momcadi,
-- Modul 5: galerije, Modul 6: novosti, Modul 7: dogadjaji (javni dio;
-- privatne prijave su u ZASEBNOJ bazi — vidi schema-prijave.sql)
-- Target: MariaDB 10.11 (Hostpoint hidapifa_hnkcms)
--
-- Pokrenuti jednom, na praznoj bazi:
--   mysql -h hidapifa.mysql.db.hostpoint.ch -u hidapifa_hnkcms -p hidapifa_hnkcms < schema.sql
-- (idempotentno — CREATE TABLE IF NOT EXISTS, siguran re-run za nove module)

-- ---------------------------------------------------------------------------
-- sponzori — odgovara Sanity tipu "sponzor" (name, logo, package, link,
-- packageDescription, order), plus `status` za Entwurf/Veröffentlicht obrazac
-- i `logo_*` kolone za self-hosted WebP pipeline (3 veličine + original).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponzori (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  naziv             VARCHAR(190) NOT NULL,

  -- Logo: originalni upload se čuva netaknut (audit/re-generiranje), tri
  -- generirane veličine su ili WebP (rasterski upload) ili identična SVG
  -- datoteka u sva tri polja (vektorski upload — nema smisla rasterizirati).
  logo_original     VARCHAR(255) NULL,
  logo_small        VARCHAR(255) NULL,   -- ~240px širina (srcset 1x)
  logo_medium       VARCHAR(255) NULL,   -- ~480px širina (srcset 2x)
  logo_large        VARCHAR(255) NULL,   -- ~800px širina (srcset 3x)
  logo_is_vector    TINYINT(1) NOT NULL DEFAULT 0,
  logo_width        SMALLINT UNSIGNED NULL,
  logo_height       SMALLINT UNSIGNED NULL,

  link              VARCHAR(500) NULL,
  paket             ENUM('Basic','Standard','Premium') NOT NULL DEFAULT 'Basic',
  opis_paketa_hr    TEXT NULL,
  opis_paketa_de    TEXT NULL,
  redoslijed        SMALLINT NOT NULL DEFAULT 100,

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_redoslijed (redoslijed),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- admin_users — TOTP 2FA admin login (obrazac po uzoru na HSL AG mini-CMS).
-- Lozinka: password_hash() (bcrypt/argon2i, ovisno o hostu).
-- totp_secret je NULL dok se 2FA prvi put ne postavi (setup-2fa.php);
-- totp_confirmed=0 dok se prvi kod ne potvrdi.
-- failed_attempts/locked_until: jednostavan lockout protiv brute-force-a
-- na lozinku i na TOTP kod (bez posebne tablice).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username          VARCHAR(60) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  totp_secret       VARCHAR(64) NULL,
  totp_confirmed    TINYINT(1) NOT NULL DEFAULT 0,
  failed_attempts   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until      DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at     DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nema početnog admin naloga u ovoj datoteci namjerno — ne želimo ikakvu
-- default lozinku u verzioniranom SQL-u. Nalog se pravi preko
-- bin/create-admin.php (vidi README.md "Prvi deploy").

-- ---------------------------------------------------------------------------
-- clan_uprave — odgovara Sanity tipu "clanUprave" (name, role, zaduzenje,
-- phone, image, order). role/zaduzenje su Sanity "localeString" (hr/de) pa
-- postaju dvije ravne kolone (isti obrazac kao sponzori.opis_paketa_hr/_de).
-- Slika je NEOBAVEZNA (za razliku od sponzori.logo_*) — Sanity shema nema
-- required() na image polju; frontend prikazuje inicijale kad slike nema.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clan_uprave (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ime               VARCHAR(190) NOT NULL,

  funkcija_hr       VARCHAR(190) NOT NULL,
  funkcija_de       VARCHAR(190) NULL,
  zaduzenje_hr      VARCHAR(255) NULL,
  zaduzenje_de      VARCHAR(255) NULL,
  telefon           VARCHAR(50) NULL,

  -- Slika: isti obrazac kao sponzori.logo_* (original + 3 WebP veličine ili
  -- sanitizirani SVG u sva tri polja), ali sve NULL-abilno jer je neobavezna.
  slika_original    VARCHAR(255) NULL,
  slika_small       VARCHAR(255) NULL,   -- ~240px širina (srcset 1x)
  slika_medium      VARCHAR(255) NULL,   -- ~480px širina (srcset 2x)
  slika_large       VARCHAR(255) NULL,   -- ~800px širina (srcset 3x)
  slika_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  slika_width       SMALLINT UNSIGNED NULL,
  slika_height      SMALLINT UNSIGNED NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_redoslijed (redoslijed),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- stranice — odgovara Sanity tipu "stranica" (title, slug, intro, body).
-- Fiksni, poznati skup stranica (isto kao u Sanity shemi): kontakt,
-- postani-clan, impressum, datenschutzerklarung — nema dinamičke [slug] rute.
-- title/intro su Sanity "localeString"/"localeText" pa postaju _hr/_de kolone
-- (isti obrazac kao ranije). body je Sanity Portable Text (rich text) —
-- ovdje pojednostavljeno na Markdown izvor (podskup: **bold**, *italic*,
-- ## / ###, > citat, - lista, 1. lista, [link](url); bez slika u body-ju,
-- stvarni sadržaj ih ne koristi). includes/markdown.php ga pretvara u HTML
-- pri svakom čitanju (izvor ostaje markdown radi urednog daljnjeg uređivanja).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stranice (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(96) NOT NULL,

  naslov_hr         VARCHAR(190) NOT NULL,
  naslov_de         VARCHAR(190) NULL,
  uvod_hr           TEXT NULL,
  uvod_de           TEXT NULL,
  sadrzaj_hr        MEDIUMTEXT NULL,   -- Markdown izvor
  sadrzaj_de        MEDIUMTEXT NULL,   -- Markdown izvor

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- momcadi — odgovara Sanity tipu "momcad" (name, slug, order, coverImage,
-- description, grupnaFotografija, popisImena[], igraci[], trener{},
-- liga, terminTreninga, gallery[]). Prvi modul s parent/child tablicama:
-- Sanity inline nizovi (igraci, popisImena, gallery) postaju child tablice
-- s FK ON DELETE CASCADE. Nema posebne "kategorije" — svaki nivo (Aktivni,
-- Seniori, Juniori) je zaseban redak, kao i u Sanityju.
-- Tri slike na nivou tima (cover, grupna, trener) koriste isti *_original/
-- small/medium/large/is_vector/width/height obrazac, samo s različitim
-- prefiksom kolona. description je Markdown (isti obrazac kao stranice).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS momcadi (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug                    VARCHAR(96) NOT NULL,
  naziv_hr                VARCHAR(190) NOT NULL,
  naziv_de                VARCHAR(190) NULL,
  redoslijed              SMALLINT NOT NULL DEFAULT 100,

  liga_hr                 VARCHAR(190) NULL,
  liga_de                 VARCHAR(190) NULL,
  termin_treninga_hr      VARCHAR(255) NULL,
  termin_treninga_de      VARCHAR(255) NULL,
  opis_hr                 MEDIUMTEXT NULL,   -- Markdown izvor
  opis_de                 MEDIUMTEXT NULL,   -- Markdown izvor

  -- Naslovna slika (hero pozadina; ako je nema, frontend koristi grupnu).
  cover_original          VARCHAR(255) NULL,
  cover_small             VARCHAR(255) NULL,
  cover_medium            VARCHAR(255) NULL,
  cover_large             VARCHAR(255) NULL,
  cover_is_vector         TINYINT(1) NOT NULL DEFAULT 0,
  cover_width             SMALLINT UNSIGNED NULL,
  cover_height            SMALLINT UNSIGNED NULL,
  cover_alt               VARCHAR(255) NULL,

  -- Grupna fotografija (glavni element stranice u oba načina prikaza).
  grupna_original         VARCHAR(255) NULL,
  grupna_small            VARCHAR(255) NULL,
  grupna_medium           VARCHAR(255) NULL,
  grupna_large            VARCHAR(255) NULL,
  grupna_is_vector        TINYINT(1) NOT NULL DEFAULT 0,
  grupna_width            SMALLINT UNSIGNED NULL,
  grupna_height           SMALLINT UNSIGNED NULL,
  grupna_alt              VARCHAR(255) NULL,

  -- Trener: Sanity inline objekt {ime, funkcija(localeString), slika} — jedan po timu.
  trener_ime              VARCHAR(190) NULL,
  trener_funkcija_hr      VARCHAR(190) NULL,
  trener_funkcija_de      VARCHAR(190) NULL,
  trener_slika_original   VARCHAR(255) NULL,
  trener_slika_small      VARCHAR(255) NULL,
  trener_slika_medium     VARCHAR(255) NULL,
  trener_slika_large      VARCHAR(255) NULL,
  trener_slika_is_vector  TINYINT(1) NOT NULL DEFAULT 0,
  trener_slika_width      SMALLINT UNSIGNED NULL,
  trener_slika_height     SMALLINT UNSIGNED NULL,

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status                  ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_redoslijed (redoslijed),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Strukturirani roster (Sanity momcad.igraci[]). Kad tim ima barem jedan
-- redak ovdje, frontend prikazuje roster; inače pada na momcad_popis_imena
-- (ista rosterMode = igraci.length > 0 logika kao danas). `redoslijed` je
-- novo polje — Sanity čuva redoslijed kao poziciju u nizu, relaciona
-- tablica treba eksplicitnu kolonu. pozicija je NULL-abilna (opciona i u Sanityju).
CREATE TABLE IF NOT EXISTS momcad_igraci (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  momcad_id         INT UNSIGNED NOT NULL,
  ime               VARCHAR(120) NOT NULL,
  prezime           VARCHAR(120) NULL,
  broj              SMALLINT UNSIGNED NULL,
  pozicija          ENUM('golman','obrana','vezni','napad') NULL,

  slika_original    VARCHAR(255) NULL,
  slika_small       VARCHAR(255) NULL,
  slika_medium      VARCHAR(255) NULL,
  slika_large       VARCHAR(255) NULL,
  slika_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  slika_width       SMALLINT UNSIGNED NULL,
  slika_height      SMALLINT UNSIGNED NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_momcad_redoslijed (momcad_id, redoslijed),
  CONSTRAINT fk_igrac_momcad FOREIGN KEY (momcad_id) REFERENCES momcadi (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy popis imena (Sanity momcad.popisImena[] — redovi "Gornji red s
-- lijeva na desno: Darijo, Andre, ..."). Zadržano 1:1 jer sve 3 stvarne
-- momčadi danas koriste SAMO ovaj prikaz; imena su zarezom odvojen string,
-- namjerno ne normalizovana (to je posao strukturiranog rostera iznad).
CREATE TABLE IF NOT EXISTS momcad_popis_imena (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  momcad_id         INT UNSIGNED NOT NULL,
  oznaka_hr         VARCHAR(190) NULL,
  oznaka_de         VARCHAR(190) NULL,
  imena             TEXT NOT NULL,
  redoslijed        SMALLINT NOT NULL DEFAULT 100,

  PRIMARY KEY (id),
  KEY idx_momcad_redoslijed (momcad_id, redoslijed),
  CONSTRAINT fk_popis_momcad FOREIGN KEY (momcad_id) REFERENCES momcadi (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Galerija (Sanity momcad.gallery[]). Trenutno prazna na sve 3 momčadi —
-- shema prati Sanity strukturu, ne samo trenutni sadržaj.
CREATE TABLE IF NOT EXISTS momcad_galerija (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  momcad_id         INT UNSIGNED NOT NULL,

  slika_original    VARCHAR(255) NULL,
  slika_small       VARCHAR(255) NULL,
  slika_medium      VARCHAR(255) NULL,
  slika_large       VARCHAR(255) NULL,
  slika_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  slika_width       SMALLINT UNSIGNED NULL,
  slika_height      SMALLINT UNSIGNED NULL,
  alt               VARCHAR(255) NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_momcad_redoslijed (momcad_id, redoslijed),
  CONSTRAINT fk_galerija_momcad FOREIGN KEY (momcad_id) REFERENCES momcadi (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- galerije — odgovara Sanity tipu "galerija" (name, slug, kategorija, godina,
-- date, description, images[]). Grupisanje po kategoriji/godini su obična
-- polja (nema taksonomije), grupisanje po godini radi frontend. Cover = prva
-- slika po redoslijedu (kao Sanity images[0]) — nema posebne kolone.
-- Najveći modul po slikama (30 galerija / 1814 slika): child tablica dobija
-- i `slika_thumb` (600x600 centralni crop) da grid ostane iste težine kao
-- Sanity 600x600 crop thumbovi na produkciji.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS galerije (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(96) NOT NULL,
  naziv_hr          VARCHAR(190) NOT NULL,
  naziv_de          VARCHAR(190) NULL,
  kategorija        ENUM('sport','feste') NOT NULL,
  godina            SMALLINT UNSIGNED NOT NULL,
  datum             DATE NULL,
  opis_hr           TEXT NULL,
  opis_de           TEXT NULL,

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_godina_datum (godina, datum),
  KEY idx_kategorija (kategorija),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS galerija_slike (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  galerija_id       INT UNSIGNED NOT NULL,

  slika_original    VARCHAR(255) NULL,
  slika_thumb       VARCHAR(255) NULL,   -- 600x600 centralni crop (grid)
  slika_small       VARCHAR(255) NULL,   -- 480px (WIDTHS_WIDE)
  slika_medium      VARCHAR(255) NULL,   -- 1200px
  slika_large       VARCHAR(255) NULL,   -- 1920px (lightbox)
  slika_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  slika_width       SMALLINT UNSIGNED NULL,
  slika_height      SMALLINT UNSIGNED NULL,
  alt               VARCHAR(255) NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_galerija_redoslijed (galerija_id, redoslijed),
  CONSTRAINT fk_slika_galerija FOREIGN KEY (galerija_id) REFERENCES galerije (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- novosti — odgovara Sanity tipu "novost" (title, slug, date(datetime),
-- category, coverImage+alt, excerpt, body). kategorija je ENUM s TAČNO
-- Sanity vrijednostima (HR/DE labele su u Next.js messages/*.json pod
-- `categories.<vrijednost>`, ključ je sirova vrijednost uklj. "Skupština").
-- body je Markdown (isti konverter kao stranice), s podrškom za slike u
-- tekstu: `![alt](url)` u zasebnom redu -> <figure>. Slike se uploaduju u
-- child tablicu novost_slike (admin daje gotov Markdown snippet). Stvarni
-- sadržaj danas nema slika u tekstu — shema prati Sanity blockContent.
-- Paginacija liste ostaje klijentska (NewsList, 9 po stranici) — API vraća
-- sve objavljene BEZ body-ja.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS novosti (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(96) NOT NULL,
  naslov_hr         VARCHAR(190) NOT NULL,
  naslov_de         VARCHAR(190) NULL,
  datum             DATETIME NOT NULL,                     -- UTC, kao Sanity datetime
  kategorija        ENUM('Eventi','Novosti','Skupština','Sport') NOT NULL DEFAULT 'Novosti',

  cover_original    VARCHAR(255) NULL,
  cover_small       VARCHAR(255) NULL,
  cover_medium      VARCHAR(255) NULL,
  cover_large       VARCHAR(255) NULL,
  cover_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  cover_width       SMALLINT UNSIGNED NULL,
  cover_height      SMALLINT UNSIGNED NULL,
  cover_alt         VARCHAR(255) NULL,

  sazetak_hr        TEXT NULL,
  sazetak_de        TEXT NULL,
  sadrzaj_hr        MEDIUMTEXT NULL,   -- Markdown izvor
  sadrzaj_de        MEDIUMTEXT NULL,   -- Markdown izvor

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_datum (datum),
  KEY idx_kategorija (kategorija),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Slike unutar teksta novosti (Sanity blockContent `image` član). Uploadaju
-- se odvojeno, admin kopira `![alt](url)` snippet u Markdown. Brisanje
-- novosti briše i retke (cascade); datoteke briše novost-delete.php.
CREATE TABLE IF NOT EXISTS novost_slike (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  novost_id         INT UNSIGNED NOT NULL,

  slika_original    VARCHAR(255) NULL,
  slika_small       VARCHAR(255) NULL,
  slika_medium      VARCHAR(255) NULL,   -- 1200px = širina koju PortableText traži za slike u tekstu
  slika_large       VARCHAR(255) NULL,
  slika_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  slika_width       SMALLINT UNSIGNED NULL,
  slika_height      SMALLINT UNSIGNED NULL,
  alt               VARCHAR(255) NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_novost_redoslijed (novost_id, redoslijed),
  CONSTRAINT fk_slika_novost FOREIGN KEY (novost_id) REFERENCES novosti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- dogadjaji — JAVNI dio Sanity tipa "dogadjaj" (name, slug, kategorija,
-- datumPocetak/Kraj, location, coverImage, description, kotizacija,
-- prijavaLink, kapacitet, program[], sponzorEventa->, galerija->, postavke
-- prijava). Sanity reference postaju FK-ovi na već migrirane tablice
-- (sponzori, galerije) s ON DELETE SET NULL — javni API vraća {name, slug}
-- galerije umjesto Sanity referenca (dogadjaj.galerija je dosad "visio").
-- kotizacija/kapacitet ostaju slobodan tekst kao u Sanityju (nikad se ne
-- provjeravaju numerički). `tajni_kod` (članski link ?kod=) se NIKAD ne
-- vraća javnim API-jem — validira ga isključivo prijavni endpoint.
-- PRIVATNE PRIJAVE NISU OVDJE: žive u zasebnoj bazi hidapifa_hnkprijave
-- (schema-prijave.sql) s vlastitim MySQL korisnikom; korisnik ove baze
-- nema nikakav grant na nju.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dogadjaji (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug              VARCHAR(96) NOT NULL,
  naziv_hr          VARCHAR(190) NOT NULL,
  naziv_de          VARCHAR(190) NULL,
  kategorija        ENUM('Turnir','Zabava','Izlet','Skupština') NULL,
  datum_pocetak     DATETIME NOT NULL,                     -- UTC, kao Sanity datetime
  datum_kraj        DATETIME NULL,                         -- ako NULL, koristi se datum_pocetak
  lokacija          VARCHAR(190) NULL,

  cover_original    VARCHAR(255) NULL,
  cover_small       VARCHAR(255) NULL,
  cover_medium      VARCHAR(255) NULL,
  cover_large       VARCHAR(255) NULL,
  cover_is_vector   TINYINT(1) NOT NULL DEFAULT 0,
  cover_width       SMALLINT UNSIGNED NULL,
  cover_height      SMALLINT UNSIGNED NULL,
  cover_alt         VARCHAR(255) NULL,

  opis_hr           MEDIUMTEXT NULL,   -- Markdown izvor
  opis_de           MEDIUMTEXT NULL,   -- Markdown izvor
  kotizacija        VARCHAR(190) NULL, -- slobodan tekst ("30-40 CHF", "Besplatno")
  kapacitet         VARCHAR(190) NULL, -- slobodan tekst ("16 ekipa", "60")
  prijava_link      VARCHAR(500) NULL, -- eksterni link za prijavu

  sponzor_id        INT UNSIGNED NULL,
  galerija_id       INT UNSIGNED NULL,

  -- Postavke prijava (Sanity grupa "prijave"). Same prijave su u drugoj bazi.
  vrsta_prijave     ENUM('bez','osoba','ekipa') NOT NULL DEFAULT 'bez',
  pristup_prijavi   ENUM('javna','clanovi') NOT NULL DEFAULT 'javna',
  prijave_otvorene  TINYINT(1) NOT NULL DEFAULT 0,
  rok_prijave       DATETIME NULL,
  tajni_kod         VARCHAR(32) NULL,  -- NIKAD u javnom API-ju

  -- Entwurf/Veröffentlicht: javni API vraća samo 'veroeffentlicht'.
  status            ENUM('entwurf','veroeffentlicht') NOT NULL DEFAULT 'veroeffentlicht',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_slug (slug),
  KEY idx_datum_pocetak (datum_pocetak),
  KEY idx_datum_kraj (datum_kraj),
  KEY idx_status (status),
  CONSTRAINT fk_dogadjaj_sponzor FOREIGN KEY (sponzor_id) REFERENCES sponzori (id) ON DELETE SET NULL,
  CONSTRAINT fk_dogadjaj_galerija FOREIGN KEY (galerija_id) REFERENCES galerije (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Program dana (Sanity dogadjaj.program[] — stavke {vrijeme, opis}).
CREATE TABLE IF NOT EXISTS dogadjaj_program (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dogadjaj_id       INT UNSIGNED NOT NULL,
  vrijeme           VARCHAR(120) NULL,
  opis              VARCHAR(255) NULL,
  redoslijed        SMALLINT NOT NULL DEFAULT 100,

  PRIMARY KEY (id),
  KEY idx_dogadjaj_redoslijed (dogadjaj_id, redoslijed),
  CONSTRAINT fk_program_dogadjaj FOREIGN KEY (dogadjaj_id) REFERENCES dogadjaji (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
