<?php
/**
 * Slikovni pipeline (dijeljen preko modula — sponzori.logo, clan_uprave.slika):
 * raster upload → 3 WebP veličine (q82) + očuvan original. SVG upload →
 * sanitiziran i spremljen kao vektor (bez rasterizacije), sve tri "veličine"
 * pokazuju na istu SVG datoteku.
 *
 * Bez Imagick zavisnosti — GD je gotovo univerzalno dostupan na shared
 * hostingu (potvrđeno i u ovom sandboxu: GD + WebP support enabled).
 */

declare(strict_types=1);

final class LogoUploadError extends RuntimeException {}

final class WebpPipeline
{
    /** Širine generiranih WebP verzija, u px (srcset 1x/2x/~3.3x) — za logotipe i portrete (kartice ≤ ~400px). */
    private const WIDTHS = ['small' => 240, 'medium' => 480, 'large' => 800];
    /** Za fotografije pune širine (hero pozadina 100vw, grupna fotografija 1200px, galerija/lightbox). */
    public const WIDTHS_WIDE = ['small' => 480, 'medium' => 1200, 'large' => 1920];
    private const QUALITY = 82;
    private const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

    /**
     * @param array $file jedan element iz $_FILES (npr. $_FILES['logo'])
     * @param string $uploadsDir apsolutna putanja do public/uploads/<modul>
     * @param int $entityId koristi se u imenima datoteka
     * @param string $filePrefix prefiks imena datoteke (npr. "sponzor", "clan") — samo
     *   radi čitljivosti na disku, nema utjecaja na jedinstvenost (svaki modul ima svoj uploadsDir)
     * @param array|null $widths ciljne širine po ključu small/medium/large; null = self::WIDTHS
     *   (logotipi/portreti), self::WIDTHS_WIDE za fotografije pune širine
     * @return array{is_vector:bool, original:string, small:string, medium:string, large:string, width:?int, height:?int}
     */
    public static function process(array $file, string $uploadsDir, int $entityId, string $filePrefix = 'sponzor', ?array $widths = null): array
    {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new LogoUploadError('Upload nije uspio (error code ' . ($file['error'] ?? 'n/a') . ').');
        }
        if ($file['size'] > self::MAX_UPLOAD_BYTES) {
            throw new LogoUploadError('Datoteka je prevelika (max 5 MB).');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        $originalsDir = $uploadsDir . '/originals';
        if (!is_dir($originalsDir) && !mkdir($originalsDir, 0755, true) && !is_dir($originalsDir)) {
            throw new LogoUploadError('Ne mogu kreirati uploads/originals direktorij.');
        }

        if ($mime === 'image/svg+xml') {
            return self::processSvg($file, $uploadsDir, $originalsDir, $entityId, $filePrefix);
        }

        return self::processRaster($file, $mime, $uploadsDir, $originalsDir, $entityId, $filePrefix, $widths ?? self::WIDTHS);
    }

    private static function processSvg(array $file, string $uploadsDir, string $originalsDir, int $id, string $filePrefix): array
    {
        $raw = file_get_contents($file['tmp_name']);
        if ($raw === false || stripos($raw, '<svg') === false) {
            throw new LogoUploadError('Datoteka nije valjan SVG.');
        }
        $clean = self::sanitizeSvg($raw);

        $filename = "{$filePrefix}-{$id}-" . bin2hex(random_bytes(4)) . '.svg';
        $dest = $uploadsDir . '/' . $filename;
        if (file_put_contents($dest, $clean) === false) {
            throw new LogoUploadError('Ne mogu spremiti SVG.');
        }
        // Original (netaknuta korisnička datoteka) čuvamo odvojeno radi audita,
        // ALI sanitiziranu verziju serviramo javno — nikad sirovi upload.
        copy($file['tmp_name'], $originalsDir . '/' . $filename);

        [$w, $h] = self::svgDimensions($clean);

        return [
            'is_vector' => true,
            'original' => 'originals/' . $filename,
            'small' => $filename,
            'medium' => $filename,
            'large' => $filename,
            'width' => $w,
            'height' => $h,
        ];
    }

    /** Uklanja <script>, event handlere (onload=...) i vanjske reference — osnovna XSS zaštita za inline SVG. */
    private static function sanitizeSvg(string $svg): string
    {
        $svg = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $svg) ?? $svg;
        $svg = preg_replace('/\son[a-z]+\s*=\s*"[^"]*"/i', '', $svg) ?? $svg;
        $svg = preg_replace("/\son[a-z]+\s*=\s*'[^']*'/i", '', $svg) ?? $svg;
        $svg = preg_replace('#<!DOCTYPE[^>]*>#i', '', $svg) ?? $svg;
        $svg = preg_replace('#<!ENTITY[^>]*>#i', '', $svg) ?? $svg;
        return $svg;
    }

    private static function svgDimensions(string $svg): array
    {
        if (preg_match('/viewBox="[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)"/i', $svg, $m)) {
            return [(int) round((float) $m[1]), (int) round((float) $m[2])];
        }
        return [null, null];
    }

    private static function processRaster(array $file, string $mime, string $uploadsDir, string $originalsDir, int $id, string $filePrefix, array $widths): array
    {
        $allowed = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp', 'image/gif' => 'imagecreatefromgif'];
        if (!isset($allowed[$mime])) {
            throw new LogoUploadError("Nepodržan tip datoteke: {$mime}. Dozvoljeno: JPG, PNG, WebP, GIF, SVG.");
        }
        if (!function_exists('imagewebp')) {
            throw new LogoUploadError('GD na ovom serveru nema WebP podršku — kontaktirati hosting.');
        }

        $src = @($allowed[$mime])($file['tmp_name']);
        if ($src === false) {
            throw new LogoUploadError('Ne mogu učitati sliku (oštećena ili nepodržana datoteka).');
        }
        imagesavealpha($src, true);

        $srcW = imagesx($src);
        $srcH = imagesy($src);

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'bin';
        $base = "{$filePrefix}-{$id}-" . bin2hex(random_bytes(4));

        // Original netaknut, za audit / re-generiranje veličina kasnije.
        move_uploaded_file($file['tmp_name'], $originalsDir . "/{$base}.{$ext}");

        $result = [
            'is_vector' => false,
            'original' => "originals/{$base}.{$ext}",
            'width' => $srcW,
            'height' => $srcH,
        ];

        foreach ($widths as $key => $targetW) {
            // Slika se ne uvećava preko izvorne veličine.
            $w = min($targetW, $srcW);
            $h = (int) round($srcH * ($w / $srcW));

            $canvas = imagecreatetruecolor($w, $h);
            imagesavealpha($canvas, true);
            imagealphablending($canvas, false);
            imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
            imagecopyresampled($canvas, $src, 0, 0, 0, 0, $w, $h, $srcW, $srcH);

            $filename = "{$base}-{$key}.webp";
            imagewebp($canvas, $uploadsDir . '/' . $filename, self::QUALITY);
            imagedestroy($canvas);

            $result[$key] = $filename;
        }
        imagedestroy($src);

        return $result;
    }

    /**
     * Briše sve datoteke jednog retka (originals + 3 veličine ili svg).
     * @param string $columnPrefix npr. "logo" (sponzori) ili "slika" (clan_uprave)
     */
    public static function delete(string $uploadsDir, array $row, string $columnPrefix = 'logo'): void
    {
        foreach (['small', 'medium', 'large'] as $size) {
            $col = "{$columnPrefix}_{$size}";
            if (!empty($row[$col])) {
                @unlink($uploadsDir . '/' . $row[$col]);
            }
        }
        $originalCol = "{$columnPrefix}_original";
        if (!empty($row[$originalCol])) {
            @unlink($uploadsDir . '/' . $row[$originalCol]);
        }
    }
}
