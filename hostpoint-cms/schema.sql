-- HNK Kroatien Schwyz — PHP+MySQL CMS backend
-- Modul 1: sponzori, Modul 2: clan_uprave
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
