-- Migracija za POSTOJEĆU bazu (staging/produkcija) — dogadjaji modul: dodaje
-- prikazi_gumb_prijave (uklj/isklj CTA gumb "Prijavi se" u "Informacije"
-- kartici — event stranica ga i dalje prikazuje ispod, u punoj formi za
-- prijavu, pa je gumb u kartici bio dupli CTA kad je forma već vidljiva).
-- Default 1 = ponašanje kao dosad (gumb prikazan); isključiti po događaju
-- po potrebi u dogadjaj-edit.php.
--
-- Potpuno aditivno, isto kao 001 — sigurno pokrenuti dok stari PHP (koji
-- ovu kolonu ne poznaje) i dalje radi. Ne referencira nijednu bazu po imenu
-- (koristi DATABASE()), identična za oba cilja:
--
--   STAGING     -> baza hidapifa_hnkcms
--   PRODUKCIJA  -> baza hidapifa_hnkprod
--
-- phpMyAdmin: odabrati bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
-- Sigurno za re-run: provjerava je li kolona već prisutna.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'prikazi_gumb_prijave'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE dogadjaji
     ADD COLUMN prikazi_gumb_prijave TINYINT(1) NOT NULL DEFAULT 1 AFTER prijava_link',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
