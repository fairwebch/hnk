<?php
/**
 * TOTP (RFC 6238) u čistom PHP-u — namjerno bez Composer paketa, jer ne
 * znamo unaprijed ima li Hostpoint shared hosting shell/composer pristup.
 * Koristi samo hash_hmac('sha1', ...), što je dio jezgre PHP-a.
 *
 * Autentikator aplikacija (Google Authenticator, Authy, 1Password, ...) se
 * postavlja ručnim unosom base32 tajne — nema QR generatora ovdje da se
 * izbjegne vanjska HTTP zavisnost; otpauth:// URI se ispisuje kao tekst.
 */

declare(strict_types=1);

final class Totp
{
    private const DIGITS = 6;
    private const PERIOD = 30;
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** Nova nasumična tajna, 20 bajta (160-bit) → 32 base32 znaka. */
    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    public static function otpauthUri(string $secret, string $accountLabel, string $issuer): string
    {
        $label = rawurlencode($issuer . ':' . $accountLabel);
        $params = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ], '', '&', PHP_QUERY_RFC3986);
        return "otpauth://totp/{$label}?{$params}";
    }

    /**
     * Provjerava 6-znamenkasti kod. Dopušta ±1 korak (30s) zbog razlike u
     * satu klijent/server — standardna TOTP praksa.
     */
    public static function verify(string $secret, string $code): bool
    {
        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }
        $timeStep = (int) floor(time() / self::PERIOD);
        for ($drift = -1; $drift <= 1; $drift++) {
            if (hash_equals(self::codeAt($secret, $timeStep + $drift), $code)) {
                return true;
            }
        }
        return false;
    }

    private static function codeAt(string $secret, int $timeStep): string
    {
        $key = self::base32Decode($secret);
        $counter = pack('N*', 0, $timeStep); // 64-bit big-endian counter
        $hash = hash_hmac('sha1', $counter, $key, true);
        $offset = ord($hash[19]) & 0x0f;
        $binary = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);
        $otp = $binary % (10 ** self::DIGITS);
        return str_pad((string) $otp, self::DIGITS, '0', STR_PAD_LEFT);
    }

    private static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }
        $bits = str_pad($bits, (int) ceil(strlen($bits) / 5) * 5, '0', STR_PAD_RIGHT);
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec($chunk)];
        }
        return $out;
    }

    private static function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $secret));
        $bits = '';
        foreach (str_split($secret) as $char) {
            $pos = strpos(self::ALPHABET, $char);
            if ($pos === false) {
                continue;
            }
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) < 8) {
                break;
            }
            $bytes .= chr(bindec($chunk));
        }
        return $bytes;
    }
}
