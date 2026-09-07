<?php
/**
 * Zajednička CORS politika za javne read-only API endpointe (api/*.php).
 * Samo naš Next.js frontend (produkcija + custom domena + Vercel preview
 * deploymenti) i localhost za lokalni razvoj smiju čitati ove endpointe iz
 * browser JS-a. Napomena: Next.js Server Component fetch (SSR) ide server-
 * -to-server i CORS se na njega uopće ne primjenjuje — ovo suženje ne
 * mijenja kako sajt radi, samo sprječava da neki TREĆI sajt čita ove
 * podatke direktno iz JS-a u browseru posjetioca.
 *
 * Izdvojeno u jednu funkciju da se politika ne duplicira (i time razilazi)
 * po svakom novom api/*.php endpointu.
 */

declare(strict_types=1);

function hnkcms_apply_public_cors(): void
{
    $allowedOrigins = [
        'https://kroatien-schwyz.vercel.app',
        'https://kroatien-schwyz.ch',
        'https://www.kroatien-schwyz.ch',
        'http://localhost:3000',
    ];
    // Vercel preview deploymenti: kroatien-schwyz-<hash>[-<team>].vercel.app
    $vercelPreviewPattern = '#^https://kroatien-schwyz-[a-z0-9-]+\.vercel\.app$#i';

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true) || preg_match($vercelPreviewPattern, $origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, OPTIONS');
}
