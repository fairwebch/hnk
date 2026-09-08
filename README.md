# HNK Kroatien Schwyz — web

Dvojezični (HR / DE-CH) sajt hrvatskog nogometnog kluba HNK Kroatien Schwyz.
Zamjena za stari WordPress sajt (`kroatien-schwyz.ch`). Sadržaj dolazi sa
self-hosted PHP/MySQL CMS-a na Hostpointu (folder `hostpoint-cms/`, vlastiti
deploy) — Sanity je u potpunosti uklonjen (vidi `hostpoint-cms/README.md`,
odjeljak "Cutover").

## Tehnologije
- **Next.js 15** (App Router, TypeScript) — statički generiran sajt (ISR, 60 s)
- **Tailwind CSS** — dizajn po hi-fi specifikaciji (hrvatska šahovnica, navy paleta, crveni CTA)
- **PHP 8 + MariaDB CMS** (`hostpoint-cms/`) — javni JSON API + admin (login + TOTP 2FA), WebP pipeline
- **next-intl** — rute `/hr/...` (default) i `/de/...`, language switcher

## Struktura
```
app/
  [locale]/            # sve javne stranice (hr | de)
    page.tsx           # Početna (hero, statistika, novosti, momčadi, galerija, sponzori, shop)
    novosti/  dogadjaji/  galerija/  momcadi/   # liste + [slug]
    uprava/  sponzoring/  kontakt/  klub/
    postani-clan/  impressum/  datenschutzerklarung/  otkazi-prijavu/  shop/
  api/                 # kontakt, postani-clan, newsletter (Brevo), prijava + otkazi-prijavu (proxy na PHP)
components/            # Header, Footer, MobileMenu, EventCountdown, Lightbox, CmsImage, HtmlContent, ...
lib/                   # *Api.ts (fetch s PHP API-ja, fallback [] / null), cmsImage.ts, cmsTypes.ts, locale.ts
i18n/  messages/       # next-intl konfiguracija i prijevodi (hr.json, de.json)
hostpoint-cms/         # PHP/MySQL CMS (schema.sql, public/api, public/admin, bin/, deploy.sh) — vidi njegov README
design/                # originalne dizajn reference (.dc.html + slika)
```

## Lokalni razvoj
```bash
npm install
cp .env.local.example .env.local   # Resend/Brevo ključevi po potrebi; sadržaj ide s api-staging bez ikakve konfiguracije
npm run dev                        # http://localhost:3000
```

## Varijable okruženja
Vidi `.env.local.example`. Sadržajni API ne treba nikakvu varijablu — svi
`lib/*Api.ts` defaultaju na `https://api-staging.kroatien-schwyz.ch`;
`*_API_BASE_URL` override služi samo za lokalno testiranje PHP-a
(`php -S 127.0.0.1:8098 -t hostpoint-cms/public`). Sajt se builda i radi i kad
API nije dostupan — kolekcije tada prikazuju prazna stanja.

## Deploy
- **Next.js:** Vercel, produkcija = grana `main` (`npx vercel --prod` ili push).
- **CMS:** `hostpoint-cms/deploy.sh staging` (rsync preko SSH na Hostpoint);
  sadržaj se uređuje na `https://api-staging.kroatien-schwyz.ch/admin/`.

## Dvojezičnost
- HR je default; sve rute su prefiksirane (`/hr`, `/de`).
- Statični UI tekstovi: `messages/hr.json` i `messages/de.json`.
- Sadržaj iz CMS-a: `_hr`/`_de` kolone; ako DE nije unesen, prikazuje se HR.
