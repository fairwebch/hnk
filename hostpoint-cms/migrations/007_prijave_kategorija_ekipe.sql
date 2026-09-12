-- Migracija za POSTOJEĆU privatnu prijave bazu (staging/produkcija) — dodaje
-- kategorija_ekipe (Aktivni/Seniori/Djeca) na ekipnu prijavu, potrebno za
-- organizaciju terena/rasporeda na malonogometnom turniru. NULL za tip
-- 'osoba' i za postojeće retke (isti obrazac kao ime/prezime/telefon —
-- obavezno-po-tipu provjerava se u api/prijava.php, ne NOT NULL ogradom,
-- pa ovo ne zahtijeva backfill postojećih prijava).
--
-- OVO JE PRIVATNA BAZA (schema-prijave.sql), NE glavna hnkcms baza —
-- pokrenuti preko bin/run-migration-prijave.php, NE preko run-migration.php
-- (koji se spaja isključivo na db_prijave stupac).
--
-- Potpuno aditivno, isti obrazac kao 001/004. Ne referencira nijednu bazu
-- po imenu (koristi DATABASE()), identična za oba cilja:
--
--   STAGING     -> privatna baza hidapifa_hnkprijave
--   PRODUKCIJA  -> privatna baza hidapifa_hnkprijprod
--
-- SSH: php bin/run-migration-prijave.php migrations/007_prijave_kategorija_ekipe.sql
-- phpMyAdmin: odabrati privatnu prijave bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
-- Sigurno za re-run: provjerava je li kolona već prisutna.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prijave' AND COLUMN_NAME = 'kategorija_ekipe'
);
SET @sql := IF(@has_col = 0,
  "ALTER TABLE prijave
     ADD COLUMN kategorija_ekipe ENUM('Aktivni','Seniori','Djeca') NULL AFTER naziv_ekipe",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
