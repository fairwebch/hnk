# Migracija sadržaja (WordPress → Sanity)

Izvor: `https://kroatien-schwyz.ch` (WP REST API).

## Datoteke
- `build-ndjson.mjs` — generira `import.ndjson` iz izvučenih WP podataka.
- `import.ndjson` — 49 dokumenata (34 novost, 6 stranica, 4 momčadi, 5 sponzora).
- `MANUAL-ENTRY.md` — popis sadržaja za ručni unos.

## Uvoz u Sanity

Preduvjet: kreiran Sanity projekt i postavljen `NEXT_PUBLIC_SANITY_PROJECT_ID`
u `.env.local` (korak „sanity login" iz glavnog README-a).

```bash
# 1. (opciono) regeneriraj NDJSON
node migration/build-ndjson.mjs

# 2. uvezi u dataset `production`
npm run import:data
# = npx sanity dataset import ./migration/import.ndjson production --replace
```

### Slike
Logotipi sponzora su lokalne datoteke (`public/assets/sponsors/`) i uvoze se
automatski. Slike novosti su na `kroatien-schwyz.ch` — ako okruženje **nema**
pristup toj domeni, uvoz tih slika će pasti; koristi `--allow-failing-assets`
da se dokumenti svejedno uvezu (bez slika):

```bash
npx sanity dataset import ./migration/import.ndjson production --replace --allow-failing-assets
```

### Puni uvoz sa slikama (opciono)
Sa računala koje ima pristup domeni `kroatien-schwyz.ch`, može se u
`build-ndjson.mjs` dodati `_sanityAsset: "image@<source_url>"` po objavi i
ponovno uvesti — tada se i slike novosti automatski preuzmu i uploadaju.
