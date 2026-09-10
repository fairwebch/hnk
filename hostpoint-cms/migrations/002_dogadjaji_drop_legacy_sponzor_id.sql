-- Migracija za POSTOJEĆU bazu (staging/produkcija) — dogadjaji modul, FAZA 2
-- (čišćenje): briše staru `dogadjaji.sponzor_id` kolonu/FK, sada nepotrebnu
-- jer je novi PHP kod (deployan poslije 001_dogadjaji_info_flyer_sponzori.sql)
-- već čita sponzore isključivo preko dogadjaj_sponzori / dogadjaj_sponzori_custom.
--
-- POKRENUTI TEK NAKON:
--   1. 001_dogadjaji_info_flyer_sponzori.sql je već pokrenut na istoj bazi
--      (prenio je sponzor_id podatke u dogadjaj_sponzori).
--   2. Novi PHP kod je deployan na taj cilj (staging ili produkcija) I
--      potvrđeno radi (npr. GET /api/dogadjaji.php?slug=... vraća
--      "sponsors": [...] s očekivanim sponzorom, ne prazno).
-- Dok se ne pokrene, stara kolona samo besposleno stoji (nije zna gata je
-- više nitko ne koristi) — nema hitnosti, ali je čisto ukloniti kad se
-- potvrdi da je novi kod stabilan.
--
-- Ne referencira nijednu bazu po imenu (koristi DATABASE()), identična za
-- oba cilja. mysql klijent: mysql -h <host> -u <korisnik> -p <baza> < migrations/002_dogadjaji_drop_legacy_sponzor_id.sql
-- phpMyAdmin: odabrati bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
--
-- Sigurno za re-run: provjerava je li kolona još prisutna prije brisanja.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'sponzor_id'
);
SET @sql := IF(@has_col > 0,
  'ALTER TABLE dogadjaji DROP FOREIGN KEY fk_dogadjaj_sponzor, DROP COLUMN sponzor_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
