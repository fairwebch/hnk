-- HNK Kroatien Schwyz — PHP+MySQL CMS backend
-- Modul 1: sponzori
-- Target: MariaDB 10.11 (Hostpoint hidapifa_hnkcms)
--
-- Pokrenuti jednom, na praznoj bazi:
--   mysql -h hidapifa.mysql.db.hostpoint.ch -u hidapifa_hnkcms -p hidapifa_hnkcms < schema.sql

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
