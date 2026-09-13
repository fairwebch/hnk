-- Migracija za POSTOJEĆU privatnu prijave bazu (staging/produkcija) —
-- kategorija_ekipe postaje VIŠESTRUKI izbor: ENUM('Aktivni','Seniori',
-- 'Djeca') -> SET('Aktivni','Seniori','Djeca'), jer klubovi/ekipe često
-- prijavljuju više kategorija odjednom (npr. i aktivne i seniore).
--
-- OČUVANJE POSTOJEĆIH VRIJEDNOSTI: MySQL/MariaDB ALTER TABLE MODIFY COLUMN
-- iz ENUM u SET s ISTIM popisom članova konvertira svaku postojeću
-- vrijednost preko njezinog string oblika — postojeća jednostruka
-- vrijednost npr. 'Seniori' postaje jednočlani set 'Seniori', NULL ostaje
-- NULL. Provjereno UŽIVO na izoliranom test-retku na stagingu prije nego
-- što je ova migracija napisana (umetnut redak s ENUM vrijednošću
-- 'Seniori', ALTER pokrenut, vrijednost potvrđeno sačuvana, redak obrisan,
-- stupac vraćen na ENUM) — nije samo teorijska pretpostavka.
--
-- Napomena: MariaDB SET pri čitanju uvijek vraća članove u redoslijedu
-- NJIHOVE DEFINICIJE (Aktivni, Seniori, Djeca), bez obzira kojim je
-- redoslijedom vrijednost izvorno upisana — dosljedan prikaz u
-- adminu/CSV-u/emailu, ne ovisi o redoslijedu klika korisnika.
--
-- OVO JE PRIVATNA BAZA (schema-prijave.sql), NE glavna hnkcms baza —
-- pokrenuti preko bin/run-migration-prijave.php, NE preko run-migration.php.
--
-- Idempotencija ovdje NE provjerava postojanje stupca (kategorija_ekipe već
-- postoji od migracije 007) nego njegov TRENUTNI TIP — ponovno pokretanje
-- nakon uspješne konverzije je siguran no-op.
--
--   STAGING     -> privatna baza hidapifa_hnkprijave
--   PRODUKCIJA  -> privatna baza hidapifa_hnkprijprod
--
-- SSH: php bin/run-migration-prijave.php migrations/008_prijave_kategorija_ekipe_multi.sql
-- phpMyAdmin: odabrati privatnu prijave bazu -> tab "SQL" -> zalijepiti -> Idi/Go.

SET @is_already_set := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prijave' AND COLUMN_NAME = 'kategorija_ekipe'
    AND COLUMN_TYPE LIKE 'set(%'
);
SET @sql := IF(@is_already_set = 0,
  "ALTER TABLE prijave MODIFY COLUMN kategorija_ekipe SET('Aktivni','Seniori','Djeca') NULL",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
