# Originalni brief naručioca (izvršiti u Claude Code)

Napravi mi kompletan sajt za HNK Kroatien Schwyz (hrvatski nogometni klub u Švicarskoj) i objavi ga na internet — od nule do live sajta. Radi u ovom folderu. Prebacujemo sajt sa WordPressa na statični Next.js sajt sa Sanity CMS-om. Kada je potrebna prijava na neki servis (Sanity, GitHub, Vercel), pokreni login komandu, otvori mi browser i sačekaj da potvrdim, pa nastavi sam.

> Napomena: dizajn svih stranica je u ovom paketu (`*.dc.html` + README.md) — implementirati taj dizajn.

## ŠTA GRADIMO
Kompletan sajt nogometnog kluba sa CMS-om preko kojeg uprava kluba sama dodaje novosti, sponzore, momčadi i galerije, bez pomoći developera. Trenutni sajt je na WordPressu (kroatien-schwyz.ch) — pravimo potpuno novi, statični sajt koji ga zamjenjuje.

## TEHNOLOGIJE
- Next.js (App Router, TypeScript)
- next-intl (ili slično) za dvojezičnost — rute /hr/... i /de/...
- Sanity kao CMS, sa Sanity Studio ugrađenim u sajt na ruti /studio (NE poseban projekat)
- Tailwind za stilove

## VIŠEJEZIČNOST (HR / DE-CH)
- Sve rute prefiksovane jezikom: /hr/... i /de/..., hrvatski default
- Language switcher u headeru, vidljiv na svim stranicama
- Svi korisniku vidljivi Sanity fieldovi lokalizovani (objekat sa hr/de poljima ili document-level i18n — dosljedno kroz sve tipove)
- Statični UI tekstovi kroz next-intl (messages/hr.json, messages/de.json)
- Ako postoji samo HR verzija sadržaja, DE polje ostaje prazno — ne izmišljati prevod

## SANITY ŠEMA
1. **novost**: naslov (string, obavezno), slug, datum, kategorija ("Eventi" / "Novosti" / "Skupština" / "Sport"), naslovna slika, kratak opis (excerpt), sadržaj (portable text sa slikama)
2. **clanUprave**: ime, funkcija, telefon (opciono), slika (opciono), redoslijed (broj, za sortiranje)
3. **momcad**: naziv, slug, opis, naslovna slika, galerija slika (opciono)
4. **sponzor**: naziv, logo, paket ("Basic" / "Standard" / "Premium"), link (opciono), opis paketa
5. **galerija**: naziv, slug, datum, opis, slike (niz)
6. **dogadjaj**: naziv, slug, datum, lokacija, opis, naslovna slika
7. **stranica**: naslov, slug, sadržaj (rich text) — O nama, Klub, Postani član, Kontakt, Impressum, Datenschutzerklärung

## STRANICE
1. Početna (/): hero sa nazivom kluba i opisom, statistika, dugme "Prijavi ekipu" / "Učlani se", najnovije novosti (3-6), teaser galerija
2. Novosti (/novosti): lista sa filterom po kategoriji
3. Novost (/novosti/[slug]): naslovna slika, naslov, datum, kategorija, sadržaj
4. O nama (/o-nama), Klub (/klub): statične stranice iz CMS-a
5. Uprava (/uprava): grid članova sortiran po redoslijedu (slika, ime, funkcija, telefon)
6. Momčadi (/momcadi + /momcadi/[slug]): pregled + pojedinačna sa opisom i galerijom
7. Galerija (/galerija + /galerija/[slug]): lista + lightbox prikaz
8. Događaji (/dogadjaji + /dogadjaji/[slug])
9. Sponzoring (/sponzoring): paketi + grid sponzora
10. Postani član (/postani-clan), Kontakt (/kontakt): iz CMS-a; kontakt forma kao mailto
11. Impressum (/impressum), Datenschutzerklärung (/datenschutzerklarung)
12. /studio: ugrađen Sanity Studio

## VAŽNI DETALJI
- Sanity project ID i dataset u .env.local
- Sajt radi i kada je kolekcija prazna (poruke tipa "Novosti uskoro stižu" — vidi dizajn)
- Responsive: mobile-first, hamburger meni

## MIGRACIJA (WP REST: https://kroatien-schwyz.ch/wp-json/wp/v2/)
1. Povuci sve posts (naslov, sadržaj, datum, kategorija, naslovna slika) → "novost" dokumenti
2. Povuci pages gdje dostupno → "stranica" dokumenti
3. Preuzmi slike i uploaduj u Sanity Assets, poveži s dokumentima
4. Za sadržaj nedostupan kroz REST (Uprava, Sponzori, Momčadi — page builder): placeholder dokumenti s praznim poljima za ručni unos

## REDOSLED IZVRŠAVANJA
1. Next.js projekat i ceo kod
2. sanity login → projekat "Kroatien Schwyz", dataset "production", ID u .env.local
3. Sve Sanity scheme
4. Migracija sa WP REST API-ja
5. Lokalna provjera (sve stranice + /studio bez grešaka)
6. git repo + commit; gh auth login → privatni repo "kroatien-schwyz-sajt" + push
7. vercel login → poveži projekat, env varijable, production deploy
8. Live URL u Sanity CORS origins (sa credentials) + http://localhost:3000
9. Otvori live sajt i proveri sve stranice

## NA KRAJU ISPIŠI
- Live URL sajta
- Adresu Studio-a (live-url/studio)
- Listu sadržaja koji nije mogao biti automatski migriran i treba ručni unos
