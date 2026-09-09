-- Migracija za POSTOJEĆU bazu (staging/produkcija) — dogadjaji modul,
-- tri proširenja: (1) uklj/isklj polja info kartice, (2) flyer slika (1:1),
-- (3) više sponzora po događaju (opći M:N + event-only).
--
-- schema.sql je idempotentan samo za CREATE TABLE (nove instalacije); ova
-- skripta prevodi VEĆ POSTOJEĆU `dogadjaji` tablicu u novo stanje, uključujući
-- prijenos podataka iz `sponzor_id` prije brisanja te kolone. Pokrenuti JEDNOM,
-- PRIJE deploya novog koda (admin/API očekuju nove kolone/tablice):
--
--   mysql klijent:
--     mysql -h hidapifa.mysql.db.hostpoint.ch -u hidapifa_hnkcms -p hidapifa_hnkcms < migrations/001_dogadjaji_info_flyer_sponzori.sql
--
--   phpMyAdmin (staging/produkcija, baza hidapifa_hnkcms):
--     tab "SQL" -> zalijepiti cijeli sadržaj ove datoteke -> Idi/Go.
--     phpMyAdmin izvršava PREPARE/EXECUTE/DEALLOCATE bez problema (standardni
--     SQL, ne mysql-CLI sintaksa) — samo pripaziti da "Enable foreign key
--     checks" ostane uključeno (default) tako da DROP FOREIGN KEY radi čisto.
--
-- Sigurno za re-run: svaki korak provjerava trenutno stanje prije izmjene
-- (INFORMATION_SCHEMA za ALTER, IF NOT EXISTS za CREATE TABLE, WHERE NOT
-- EXISTS za INSERT), pa prekinuti/ponovljeni run ne duplira ni ne puca.

-- 1) Uklj/isklj prikaza polja u info kartici — default 1 (isto ponašanje kao dosad).
SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'prikazi_pocetak'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE dogadjaji
     ADD COLUMN prikazi_pocetak      TINYINT(1) NOT NULL DEFAULT 1 AFTER datum_pocetak,
     ADD COLUMN prikazi_kraj         TINYINT(1) NOT NULL DEFAULT 1 AFTER datum_kraj,
     ADD COLUMN prikazi_lokaciju     TINYINT(1) NOT NULL DEFAULT 1 AFTER lokacija,
     ADD COLUMN prikazi_kotizaciju   TINYINT(1) NOT NULL DEFAULT 1 AFTER kotizacija,
     ADD COLUMN prikazi_kapacitet    TINYINT(1) NOT NULL DEFAULT 1 AFTER kapacitet',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Flyer slika (1:1) — isti obrazac kao cover_*.
SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'flyer_small'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE dogadjaji
     ADD COLUMN flyer_original  VARCHAR(255) NULL AFTER cover_alt,
     ADD COLUMN flyer_small     VARCHAR(255) NULL AFTER flyer_original,
     ADD COLUMN flyer_medium    VARCHAR(255) NULL AFTER flyer_small,
     ADD COLUMN flyer_large     VARCHAR(255) NULL AFTER flyer_medium,
     ADD COLUMN flyer_is_vector TINYINT(1) NOT NULL DEFAULT 0 AFTER flyer_large,
     ADD COLUMN flyer_width     SMALLINT UNSIGNED NULL AFTER flyer_is_vector,
     ADD COLUMN flyer_height    SMALLINT UNSIGNED NULL AFTER flyer_width,
     ADD COLUMN flyer_alt       VARCHAR(255) NULL AFTER flyer_height',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Više sponzora — nove tablice (isto kao schema.sql, CREATE TABLE IF NOT EXISTS
--    je već idempotentno).
CREATE TABLE IF NOT EXISTS dogadjaj_sponzori (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dogadjaj_id       INT UNSIGNED NOT NULL,
  sponzor_id        INT UNSIGNED NOT NULL,
  redoslijed        SMALLINT NOT NULL DEFAULT 100,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_dogadjaj_sponzor (dogadjaj_id, sponzor_id),
  KEY idx_dogadjaj_redoslijed (dogadjaj_id, redoslijed),
  CONSTRAINT fk_ds_dogadjaj FOREIGN KEY (dogadjaj_id) REFERENCES dogadjaji (id) ON DELETE CASCADE,
  CONSTRAINT fk_ds_sponzor  FOREIGN KEY (sponzor_id)  REFERENCES sponzori (id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dogadjaj_sponzori_custom (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dogadjaj_id       INT UNSIGNED NOT NULL,
  naziv             VARCHAR(190) NOT NULL,
  link              VARCHAR(500) NULL,

  logo_original     VARCHAR(255) NULL,
  logo_small        VARCHAR(255) NULL,
  logo_medium       VARCHAR(255) NULL,
  logo_large        VARCHAR(255) NULL,
  logo_is_vector    TINYINT(1) NOT NULL DEFAULT 0,
  logo_width        SMALLINT UNSIGNED NULL,
  logo_height       SMALLINT UNSIGNED NULL,

  redoslijed        SMALLINT NOT NULL DEFAULT 100,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_dogadjaj_redoslijed (dogadjaj_id, redoslijed),
  CONSTRAINT fk_dsc_dogadjaj FOREIGN KEY (dogadjaj_id) REFERENCES dogadjaji (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3a) Prijenos postojećih dogadjaji.sponzor_id -> dogadjaj_sponzori, PRIJE brisanja
--     kolone. Samo ako kolona sponzor_id još postoji (siguran re-run).
SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'sponzor_id'
);
SET @sql := IF(@has_col > 0,
  'INSERT INTO dogadjaj_sponzori (dogadjaj_id, sponzor_id, redoslijed)
     SELECT id, sponzor_id, 10 FROM dogadjaji WHERE sponzor_id IS NOT NULL
   ON DUPLICATE KEY UPDATE redoslijed = redoslijed',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b) Stara kolona/FK se briše tek nakon prijenosa podataka gore.
SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'sponzor_id'
);
SET @sql := IF(@has_col > 0,
  'ALTER TABLE dogadjaji DROP FOREIGN KEY fk_dogadjaj_sponzor, DROP COLUMN sponzor_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
