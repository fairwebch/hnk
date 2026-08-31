# Sadržaj za ručni unos (nakon migracije)

Ovaj popis pokriva sadržaj koji **nije mogao biti automatski migriran** sa starog
WordPress sajta i treba ga unijeti ručno u Sanity Studio (`/studio`).

## Zašto nije automatski migrirano

Radno okruženje u kojem je pokrenuta migracija nema mrežni pristup domeni
`kroatien-schwyz.ch` (blokirano mrežnom politikom), pa se **slike** (koje su
hostane na `kroatien-schwyz.ch/wp-content/uploads/...`) nisu mogle preuzeti i
uploadati. Dio sadržaja (Impressum, Klub, Uprava, ...) na starom sajtu generira
plugin/page-builder i **nije dostupan kroz WP REST API**.

---

## 1. Novosti — naslovne i inline slike  (34 objave)
Tekst svih 34 objava (naslov, datum, kategorija, sažetak) **je migriran**.
Treba ručno dodati:
- **Naslovnu sliku** za svaku objavu (izvor: WP Media Library, `featured_media`).
- Po želji, **pun tekst članka** — trenutno je unesen sažetak kao tijelo teksta.
  Puni tekstovi postoje na starom sajtu i mogu se prekopirati.

> Napomena: alternativno se sve slike mogu automatski uvesti ponovnim
> pokretanjem `npm run import:data` sa računala koje **ima** pristup domeni
> `kroatien-schwyz.ch` (vidi `migration/README.md`, opcija „puni uvoz sa slikama").

## 2. Statične stranice — sadržaj  (page-builder/shortcode)
Kreirani su prazni dokumenti (tip **Stranica**) sa ispravnim slugovima; unijeti tekst:
- **O nama** (`o-nama`) — povijest kluba (izvor: stara stranica „O Nama" / objava „Povijest HNK Kroatien Schwyz")
- **Klub** (`klub`)
- **Postani član** (`postani-clan`) — uvjeti članstva
- **Kontakt** (`kontakt`) — dodatni tekst uz kontakt formu (opciono)
- **Impressum** (`impressum`) — pravni tekst (na starom sajtu preko `[legally_imp]` shortcode-a)
- **Datenschutzerklärung** (`datenschutzerklarung`) — pravni tekst

## 3. Uprava  (članovi upravnog odbora)
Nije migrirano (page-builder). Za svakog člana unijeti: **ime, funkciju (HR/DE),
telefon (opciono), sliku, redoslijed**. Poznati podaci sa starog sajta:
- Predsjednik: **Robert Perković**
- (ostali članovi — vidi staru stranicu „Uprava")

## 4. Momčadi  (opis + galerije)
Kreirane 4 momčadi sa nazivima: **Aktivni, Seniori, Juniori U16, Juniori U12**.
Dodati: **opis** (HR/DE), **naslovnu sliku** i **galeriju** za svaku.

## 5. Sponzori  (provjera)
Uvezeno 5 sponzora sa **stvarnim logotipima** (iz `public/assets/sponsors/`):
Croaticum, Masada Swiss, Autocenter Goldau AG, HSL AG, PlanA AG Gebäudetechnik.
Provjeriti/urediti: **paket** (Basic/Standard/Premium), **web link**, **opis paketa**.
Dodati ostale sponzore po potrebi.

## 6. Galerije
Nijedna galerija nije migrirana (na starom sajtu su u page-builderu). Kreirati
galerije u Studiju i uploadati fotografije (izvor: WP Media Library / društvene mreže).

## 7. Događaji (s odbrojavanjem)
WordPress kalendar (The Events Calendar) **nema objavljenih događaja**, pa ništa
nije migrirano. Dodati **nadolazeće događaje** u Studiju — sekcija Događaji na sajtu
prikazuje odbrojavanje do sljedećeg događaja.

## 8. DE (njemački) prijevodi
Sav migrirani tekst je na **hrvatskom (HR)**. DE-CH polja su ostavljena prazna
(po briefu se ne izmišljaju prijevodi). Popuniti u Studiju gdje je potrebno —
sajt automatski pokazuje HR ako DE nije unesen.
