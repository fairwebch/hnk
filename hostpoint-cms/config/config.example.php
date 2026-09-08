<?php
/**
 * Kopirati u config/config.php (NE commitati config.php u git — vidi .gitignore)
 * i popuniti stvarne vrijednosti. config.php se na Hostpointu stavlja IZVAN
 * public/ document-roota (u hostpoint-cms/config/), tako da nikad nije
 * dostupan preko HTTP-a čak i da .htaccess zakaže.
 */

return [
    'db' => [
        // Interni host (sa samog hostinga/aplikacije) — koristiti ovaj u produkciji.
        'host' => 'hidapifa.mysql.db.internal',
        'name' => 'hidapifa_hnkcms',
        'user' => 'hidapifa_hnkcms',
        'pass' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // PRIVATNA baza za prijave na događaje (osobni podaci) — ZASEBNA baza i
    // ZASEBAN MySQL korisnik. Korisnik iz 'db' iznad nema grant na nju; na
    // nju se spajaju samo api/prijava.php, admin dashboard prijava i
    // bin/purge-prijave.php. Vidi schema-prijave.sql.
    'db_prijave' => [
        'host' => 'hidapifa.mysql.db.internal',
        'name' => 'hidapifa_hnkprijave',
        'user' => 'hidapifa_hnkprijave',
        'pass' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // Javni URL ove poddomene — koristi se za apsolutne URL-ove logotipa u
    // API odgovoru.
    'public_base_url' => 'https://api-staging.kroatien-schwyz.ch',

    // URL sajta (Next.js) — za link otkaza prijave u potvrdnom e-mailu.
    'site_base_url' => 'https://kroatien-schwyz.vercel.app',

    // E-mail (Resend HTTP API, isti servis kao Next.js rute). Ključ ide
    // ovdje (van docroota), nikad u kod.
    'resend' => [
        'api_key' => 'CHANGE_ME',
        'from' => 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>',
        'contact_to' => 'info@kroatien-schwyz.ch',  // obavijesti klubu o novoj prijavi/otkazu
    ],

    // Naziv izdavatelja koji se prikazuje u autentikator aplikaciji (TOTP).
    'totp_issuer' => 'HNK Kroatien Schwyz CMS (staging)',

    // Session cookie ime — zasebno od WP/drugih sajtova na istom nalogu
    // (svaki sajt ima svoju poddomenu pa kolačići već ne kolidiraju, ali
    // eksplicitno ime je dodatna sigurnost).
    'session_name' => 'hnkcms_admin',
];
