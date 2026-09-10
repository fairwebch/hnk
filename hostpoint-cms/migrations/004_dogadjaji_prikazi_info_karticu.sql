-- Migracija za POSTOJEĆU bazu (staging/produkcija) — dogadjaji modul: dodaje
-- prikazi_info_karticu, ručni master prekidač za cijelu "Informacije"
-- karticu na javnoj stranici, neovisan o pojedinačnim prikazi_pocetak/
-- kraj/lokaciju/kotizaciju/kapacitet/gumb_prijave poljima. Frontend
-- dodatno i sam sakriva karticu kad nema ničeg vidljivog za prikazati
-- (svi pojedinačni toggle-ovi isključeni i CTA gumb isključen/nepotreban)
-- — ovaj toggle je za slučaj kad admin želi karticu sakriti ručno bez
-- obzira na to.
-- Default 1 = ponašanje kao dosad (kartica prikazana).
--
-- Potpuno aditivno, isto kao 001/003 — sigurno pokrenuti dok stari PHP
-- (koji ovu kolonu ne poznaje) i dalje radi. Ne referencira nijednu bazu
-- po imenu (koristi DATABASE()), identična za oba cilja:
--
--   STAGING     -> baza hidapifa_hnkcms
--   PRODUKCIJA  -> baza hidapifa_hnkprod
--
-- SSH: php bin/run-migration.php migrations/004_dogadjaji_prikazi_info_karticu.sql
-- phpMyAdmin: odabrati bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
-- Sigurno za re-run: provjerava je li kolona već prisutna.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'prikazi_info_karticu'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE dogadjaji
     ADD COLUMN prikazi_info_karticu TINYINT(1) NOT NULL DEFAULT 1 AFTER prikazi_gumb_prijave',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
