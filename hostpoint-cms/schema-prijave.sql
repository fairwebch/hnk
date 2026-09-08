-- HNK Kroatien Schwyz — PRIVATNA baza za prijave na događaje (osobni podaci)
-- Target: MariaDB 10.11 (Hostpoint), ZASEBNA baza `hidapifa_hnkprijave`
--
-- Zašto zasebna baza: izolacija na nivou MySQL privilegija, ne discipline u
-- kodu. Korisnik javne baze (hidapifa_hnkcms, kojim radi sav javni api/*.php)
-- NEMA nikakav grant na ovu bazu. Na nju se spajaju isključivo prijavni
-- endpoint (api/prijava.php), admin dashboard prijava (iza login/2FA) i
-- bin/purge-prijave.php (retencija) — preko konekcije `db_prijave` iz
-- config.php. Odvojeni backup/dump.
--
-- Pokrenuti jednom, kao korisnik te baze:
--   mysql -h hidapifa.mysql.db.hostpoint.ch -u <prijave_user> -p hidapifa_hnkprijave < schema-prijave.sql
--
-- Retencija (dogovoreno): hard-delete 30 dana nakon kraja događaja
-- (datum_kraj kopiran ovdje jer je događaj u drugoj bazi) i 30 dana nakon
-- otkaza. Bez FK-a na dogadjaji (druga baza) — dogadjaj_id + kopija
-- slug/naziv/datum_kraj radi samostalnosti dashboarda i purge-a.

CREATE TABLE IF NOT EXISTS prijave (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tip                   ENUM('osoba','ekipa') NOT NULL,

  -- Kopija javnih podataka događaja u trenutku prijave (druga baza, bez FK).
  dogadjaj_id           INT UNSIGNED NOT NULL,
  dogadjaj_slug         VARCHAR(96) NOT NULL,
  dogadjaj_naziv_hr     VARCHAR(190) NOT NULL,
  dogadjaj_naziv_de     VARCHAR(190) NULL,
  dogadjaj_datum_kraj   DATETIME NOT NULL,   -- COALESCE(datum_kraj, datum_pocetak); osnova retencije

  -- Osobni podaci (Sanity prijavaOsoba / prijavaEkipa — isti skup polja).
  ime                   VARCHAR(80) NULL,    -- osoba
  prezime               VARCHAR(80) NULL,    -- osoba
  naziv_ekipe           VARCHAR(120) NULL,   -- ekipa
  kontakt_osoba         VARCHAR(120) NULL,   -- ekipa
  email                 VARCHAR(190) NOT NULL,
  telefon               VARCHAR(60) NULL,
  broj_osoba            TINYINT UNSIGNED NOT NULL DEFAULT 1,
  napomena              TEXT NULL,
  jezik                 ENUM('hr','de') NOT NULL DEFAULT 'hr',

  -- Privola (checkbox u formi, novo — politika privatnosti to pretpostavlja).
  privola_at            DATETIME NOT NULL,

  status_placanja       ENUM('neplaceno','placeno') NOT NULL DEFAULT 'neplaceno',
  datum_prijave         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- api/prijava.php eksplicitno upisuje UTC_TIMESTAMP() (svi datumi u bazi su UTC)
  otkazana              TINYINT(1) NOT NULL DEFAULT 0,
  datum_otkaza          DATETIME NULL,
  -- Token za link otkaza iz potvrdnog e-maila: čuva se SAMO SHA-256 hash
  -- (curenje dumpa ne daje upotrebljive linkove).
  otkazni_token_hash    CHAR(64) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_token (otkazni_token_hash),
  KEY idx_dogadjaj (dogadjaj_id, otkazana),
  KEY idx_retencija (dogadjaj_datum_kraj),
  KEY idx_otkaz (otkazana, datum_otkaza)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limit prijavnog endpointa (zamjena za in-memory Map iz Next.js rute):
-- čuva se samo SHA-256 hash IP adrese + prozor; purge briše retke starije
-- od 1 h. Nema osobnih podataka u čitljivom obliku.
CREATE TABLE IF NOT EXISTS prijave_rate_limit (
  ip_hash               CHAR(64) NOT NULL,
  prozor_od             DATETIME NOT NULL,
  broj                  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash),
  KEY idx_prozor (prozor_od)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dnevnik retencije: samo brojevi, nikad osobni podaci.
CREATE TABLE IF NOT EXISTS prijave_purge_log (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  izvrseno_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  obrisano_isteklo      INT UNSIGNED NOT NULL DEFAULT 0,  -- 30 dana nakon kraja događaja
  obrisano_otkazano     INT UNSIGNED NOT NULL DEFAULT 0,  -- 30 dana nakon otkaza
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
