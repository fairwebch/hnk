<?php
/**
 * Logo pipeline: raster upload → 3 WebP veličine (q82) + očuvan original.
 * SVG upload → sanitiziran i spremljen kao vektor (bez rasterizacije),
 * sve tri "veličine" pokazuju na istu SVG datoteku.
 *
 * Bez Imagick zavisnosti — GD je gotovo univerzalno dostupan na shared
 * hostingu (potvrđeno i u ovom sandboxu: GD + WebP support enabled).
 */

declare(strict_types=1);

final class LogoUploadError extends RuntimeException {}

final class WebpPipeline
{
    /** Širine generiranih WebP verzija, u px (srcset 1x/2x/~3.3x). */
    private const WIDTHS = ['small' => 240, 'medium' => 480, 'large' => 800];
    private const QUALITY = 82;
    private const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

    /**
     * @param array $file jedan element iz $_FILES (npr. $_FILES['logo'])
     * @param string $uploadsDir apsolutna putanja do public/uploads/sponzori
     * @param int $sponzorId koristi se u imenima datoteka
     * @return array{is_vector:bool, original:string, small:string, medium:string, large:string, width:?int, height:?int}
     */
    public static function process(array $file, string $uploadsDir, int $sponzorId): array
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
            return self::processSvg($file, $uploadsDir, $originalsDir, $sponzorId);
        }

        return self::processRaster($file, $mime, $uploadsDir, $originalsDir, $sponzorId);
    }

    private static function processSvg(array $file, string $uploadsDir, string $originalsDir, int $id): array
    {
        $raw = file_get_contents($file['tmp_name']);
        if ($raw === false || stripos($raw, '<svg') === false) {
            throw new LogoUploadError('Datoteka nije valjan SVG.');
        }
        $clean = self::sanitizeSvg($raw);

        $filename = "sponzor-{$id}-" . bin2hex(random_bytes(4)) . '.svg';
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

    private static function processRaster(array $file, string $mime, string $uploadsDir, string $originalsDir, int $id): array
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
        $base = "sponzor-{$id}-" . bin2hex(random_bytes(4));

        // Original netaknut, za audit / re-generiranje veličina kasnije.
        move_uploaded_file($file['tmp_name'], $originalsDir . "/{$base}.{$ext}");

        $result = [
            'is_vector' => false,
            'original' => "originals/{$base}.{$ext}",
            'width' => $srcW,
            'height' => $srcH,
        ];

        foreach (self::WIDTHS as $key => $targetW) {
            // Logo se ne uvećava preko izvorne veličine.
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

    /** Briše sve datoteke jednog sponzora (originals + 3 veličine ili svg). */
    public static function delete(string $uploadsDir, array $row): void
    {
        foreach (['logo_small', 'logo_medium', 'logo_large'] as $col) {
            if (!empty($row[$col])) {
                @unlink($uploadsDir . '/' . $row[$col]);
            }
        }
        if (!empty($row['logo_original'])) {
            @unlink($uploadsDir . '/' . $row['logo_original']);
        }
    }
}
