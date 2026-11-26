-- Migracija za POSTOJEĆU bazu (staging/produkcija) — novosti modul: fokus
-- naslovne slike, tj. koji dio slike ostaje vidljiv kad je kartica (početna,
-- lista novosti, mobitel) uža ili viša od same slike (object-position).
--
-- Default 'sredina' = dosadašnje ponašanje (centrirani izrez), pa svi
-- postojeći članci izgledaju točno kao prije; vrijednost se mijenja samo
-- ručno u adminu (novost-edit.php), po članku.
--
-- Potpuno aditivno, isti obrazac kao 001/004/007/009. Ne referencira nijednu
-- bazu po imenu (koristi DATABASE()), identična za oba cilja:
--
--   STAGING     -> baza hidapifa_hnkcms
--   PRODUKCIJA  -> baza hidapifa_hnkprod
--
-- SSH: php bin/run-migration.php migrations/010_novosti_cover_fokus.sql
-- phpMyAdmin: odabrati bazu -> tab "SQL" -> zalijepiti -> Idi/Go.
-- Sigurno za re-run: provjerava je li stupac već prisutan.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'novosti' AND COLUMN_NAME = 'cover_fokus'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE novosti
     ADD COLUMN cover_fokus ENUM(''sredina'',''lijevo'',''desno'',''gore'',''dolje'') NOT NULL DEFAULT ''sredina'' AFTER cover_alt',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
