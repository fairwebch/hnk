-- Migracija za POSTOJEĆU bazu (staging/produkcija) — dogadjaji modul: tri
-- nova stupca za strukturiranu cijenu ekipne prijave po kategoriji
-- (Aktivni/Seniori/Djeca), potpuno odvojena od postojećeg slobodno-
-- tekstualnog `kotizacija` polja koje ostaje netaknuto i dalje radi za
-- osobne prijave i za svaki događaj koji strukturiranu cijenu ne
-- konfigurira (vidi doc-komentar iznad CREATE TABLE dogadjaji u
-- schema.sql i admin/includes/kotizacija-ekipe.php za formulu izračuna).
--
-- NULL i 0.00 tretiraju se jednako (obje = "besplatno za tu kategoriju")
-- — nema backfilla postojećih redaka, sve ostaju NULL (= "koristi stari
-- slobodni tekst kotizacija") dok admin ručno ne unese cijenu po
-- kategoriji za neki događaj preko admin panela.
--
-- Potpuno aditivno, isti obrazac kao 001/004/007. Ne referencira nijednu
-- bazu po imenu (koristi DATABASE()), identična za oba cilja:
--
--   STAGING     -> baza hidapifa_hnkcms
--   PRODUKCIJA  -> baza hidapifa_hnkprod
--
-- SSH: php bin/run-migration.php migrations/009_dogadjaji_cijena_po_kategoriji.sql
-- phpMyAdmin: odabrati bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
-- Sigurno za re-run: provjerava je li stupac već prisutan.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dogadjaji' AND COLUMN_NAME = 'cijena_aktivni'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE dogadjaji
     ADD COLUMN cijena_aktivni DECIMAL(6,2) NULL AFTER kotizacija,
     ADD COLUMN cijena_seniori DECIMAL(6,2) NULL AFTER cijena_aktivni,
     ADD COLUMN cijena_djeca   DECIMAL(6,2) NULL AFTER cijena_seniori',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
