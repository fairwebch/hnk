# HNK Kroatien Schwyz — web

Dvojezični (HR / DE-CH) sajt hrvatskog nogometnog kluba HNK Kroatien Schwyz,
sa Sanity CMS-om. Zamjena za stari WordPress sajt (`kroatien-schwyz.ch`).

## Tehnologije
- **Next.js 15** (App Router, TypeScript) — statički generiran sajt (ISR)
- **Tailwind CSS** — dizajn po hi-fi specifikaciji (hrvatska šahovnica, navy paleta, crveni CTA)
- **Sanity v3** — CMS, sa **Studijem ugrađenim na `/studio`** (isti projekt)
- **next-intl** — rute `/hr/...` (default) i `/de/...`, language switcher

## Struktura
```
app/
  [locale]/            # sve javne stranice (hr | de)
    page.tsx           # Početna (hero, statistika, novosti, galerija, sljedeći event)
    novosti/           # lista + [slug]
    dogadjaji/         # lista (odbrojavanje) + [slug]
    galerija/          # lista + [slug] (lightbox)
    momcadi/           # lista + [slug]
    uprava/  sponzoring/  kontakt/  klub/  o-nama/
    postani-clan/  impressum/  datenschutzerklarung/
  studio/[[...tool]]/  # ugrađeni Sanity Studio → /studio
components/            # Header, Footer, MobileMenu, EventCountdown, Lightbox, ...
sanity/                # sheme, klijent, GROQ upiti, env
i18n/  messages/       # next-intl konfiguracija i prijevodi (hr.json, de.json)
migration/             # WP → Sanity migracija (vidi migration/README.md)
design/                # originalne dizajn reference (.dc.html + slika)
```

## Lokalni razvoj
```bash
npm install
cp .env.local.example .env.local   # popuni Sanity project ID
npm run dev                        # http://localhost:3000
```
Studio: `http://localhost:3000/studio`

## Varijable okruženja (`.env.local`)
```
NEXT_PUBLIC_SANITY_PROJECT_ID=<id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
```
Sajt se builda i radi i **bez** Sanity projekta — sve kolekcije tada prikazuju
prazna stanja („Novosti uskoro stižu" itd.).

## Sanity
```bash
npx sanity login
npx sanity init --env          # projekt „Kroatien Schwyz", dataset „production"
npm run import:data            # uvoz migriranog sadržaja (vidi migration/)
```
Sheme: `novost`, `dogadjaj`, `galerija`, `momcad`, `clanUprave`, `sponzor`, `stranica`.
Lokalizacija: `localeString` / `localeText` / `localeBlockContent` (polja `hr` / `de`).

## Deploy (Vercel)
```bash
npx vercel            # poveži projekt, postavi env varijable
npx vercel --prod
```
Nakon deploya dodati live URL (i `http://localhost:3000`) u Sanity
**CORS origins** (sa credentials): Sanity → Project → API → CORS.

## Dvojezičnost
- HR je default; sve rute su prefiksirane (`/hr`, `/de`).
- Statični UI tekstovi: `messages/hr.json` i `messages/de.json`.
- Sadržaj iz Sanityja: lokalizirana polja; ako DE nije unesen, prikazuje se HR.
