<?php
/**
 * Slanje e-maila preko Resend HTTP API-ja (isti servis kao Next.js rute) —
 * curl, bez Composer paketa. Ključ i pošiljatelj su u config.php (van
 * docroota). Vraća true/false; greške se logiraju u PHP error log, nikad
 * korisniku (osobni podaci u porukama).
 */

declare(strict_types=1);

function hnkcms_mail_config(): array
{
    $r = hnkcms_config()['resend'] ?? [];
    return [
        'api_key' => $r['api_key'] ?? '',
        'from' => $r['from'] ?? 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>',
        'contact_to' => $r['contact_to'] ?? 'info@kroatien-schwyz.ch',
    ];
}

function hnkcms_send_mail(string $to, string $subject, string $html, ?string $replyTo = null): bool
{
    $cfg = hnkcms_mail_config();
    if ($cfg['api_key'] === '' || $cfg['api_key'] === 'CHANGE_ME') {
        error_log('[hnkcms mail] resend.api_key nije postavljen');
        return false;
    }
    $payload = ['from' => $cfg['from'], 'to' => [$to], 'subject' => $subject, 'html' => $html];
    if ($replyTo) {
        $payload['reply_to'] = $replyTo;
    }
    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['api_key'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) {
        error_log("[hnkcms mail] resend HTTP {$code} {$err} " . substr((string) $body, 0, 200));
        return false;
    }
    return true;
}

/** HTML escape za sadržaj e-maila. */
function hnkcms_mail_esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
