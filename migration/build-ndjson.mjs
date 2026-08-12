/**
 * Builds migration/import.ndjson for `sanity dataset import`.
 *
 * Source: WordPress (kroatien-schwyz.ch) via the WP REST/MCP export.
 * - novost: all 34 published posts (title, slug, date, category, excerpt→body).
 *   Featured images are NOT embedded here: the WP media host is unreachable
 *   from the build network, so images are listed for manual upload in Studio.
 * - stranica: placeholders for the 6 CMS pages (their live content is rendered
 *   by page-builder/shortcodes and is not exposed through the REST API).
 * - momcad: the 4 known teams as starter docs.
 * - sponzor: 5 sponsors seeded with the real local logo files from public/assets.
 *
 * Run: node migration/build-ndjson.mjs   (writes migration/import.ndjson)
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---- helpers ---------------------------------------------------------------
const ENT = {
  '&#8211;': '–', '&#8212;': '—', '&#038;': '&', '&amp;': '&',
  '&#171;': '«', '&#187;': '»', '&#8220;': '“', '&#8221;': '”',
  '&#8217;': '’', '&#8230;': '…', '&hellip;': '…', '&nbsp;': ' ',
};
function decode(s = '') {
  let out = s;
  for (const [k, v] of Object.entries(ENT)) out = out.split(k).join(v);
  return out.replace(/\s*\[(…|…)\]\s*$/u, '').trim();
}
const locStr = (hr) => ({ _type: 'localeString', hr });
const locText = (hr) => ({ _type: 'localeText', hr });
function ptBlock(text) {
  if (!text) return undefined;
  return {
    _type: 'localeBlockContent',
    hr: text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => ({
        _type: 'block',
        _key: `b${i}`,
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', _key: `s${i}`, text: p, marks: [] }],
      })),
  };
}
const slugField = (current) => ({ _type: 'slug', current });

// ---- category map ----------------------------------------------------------
const CAT = { 5: 'Eventi', 28: 'Novosti', 3: 'Skupština', 4: 'Sport', 1: 'Novosti' };

// ---- posts (WP export) -----------------------------------------------------
const posts = [
  { id: 3703, slug: 'poziv-na-godisnju-skupstinu-hnk-kroatien-schwyz-2026', date: '2026-04-17T09:43:26Z', cat: 1, title: 'Poziv na godišnju skupštinu HNK Kroatien Schwyz 2026', excerpt: 'Pozivamo sve članove HNK Kroatien Schwyz na godišnju skupštinu koja će se održati u subotu, 23. svibnja 2026. na igralištu Widmen u Muotathalu. Početak: 12:00 sati.' },
  { id: 3656, slug: 'uspjesno-odrzana-zabava-u-brunnenu-07-02-2026', date: '2026-02-15T11:27:27Z', cat: 5, title: 'Uspješno održana zabava u Brunnenu – 07.02.2026.', excerpt: 'Dragi članovi i prijatelji HNK Kroatien Schwyz, sa velikim zadovoljstvom vas obavještavam da je zabava održana 07. veljače 2026. godine u Brunnenu protekla izuzetno uspješno.' },
  { id: 3636, slug: 'premijera-filma-diva-zahvala', date: '2025-12-10T09:51:40Z', cat: 5, title: 'Premijera filma „Diva“ – Zahvala', excerpt: 'HNK Kroatien Schwyz imao je iznimnu čast 7. prosinca 2025. u Brunnenu organizirati premijeru hrvatskog filma „Diva“. Ovaj kulturni događaj okupio je brojne uzvanike, prijatelje kluba.' },
  { id: 3544, slug: 'nas-klub-koristi-proizvode-od-axa-nova', date: '2025-11-13T10:23:26Z', cat: 1, title: 'Naš klub koristi proizvode od AXA NOVA', excerpt: 'S ponosom ističemo da naši igrači koriste proizvode AXA NOVA, poznate po svojoj vrhunskoj kvaliteti i pouzdanosti. Zahvaljujemo se tvrtki AXA NOVA na podršci i sponzorstvu.' },
  { id: 3535, slug: 'premijera-filma-diva-07-12-u-brunnenu', date: '2025-10-14T12:45:10Z', cat: 1, title: 'Premijera Filma “DIVA” 07.12 u Brunnenu', excerpt: 'Film “DIVA” – priča o vjeri, časti i hercegovačkoj heroini Divi Grabovčevoj stiže u Švicarsku! Nakon velikog uspjeha u domovini, film redatelja Branka Perića stiže u Brunnen.' },
  { id: 3527, slug: '19-malonogometni-turnir-prijave-otvorene', date: '2025-09-05T15:28:16Z', cat: 1, title: '19. Malonogometni Turnir – Prijave otvorene!', excerpt: 'Dragi sportaši i ljubitelji nogometa, s ponosom najavljujemo 19. Malonogometni Turnir, koji će se ove godine po prvi put igrati kroz dva dana!' },
  { id: 3518, slug: 'izvjestaj-sa-30-godisnje-skupstine-hnk-kroatien-schwyz', date: '2025-06-11T06:59:58Z', cat: 1, title: 'Izvještaj sa 30. godišnje skupštine HNK Kroatien Schwyz', excerpt: 'Datum i mjesto održavanja: 07.06.2025., Muotathal. Broj nazočnih članova: 55. Predsjednik kluba, Robert, pozdravio je prisutne te iznio izvještaj o radu kluba.' },
  { id: 3509, slug: 'izlet-u-europapark-povodom-30-obljetnice-17-05-2025', date: '2025-05-20T08:50:31Z', cat: 5, title: 'Izlet u Europapark povodom 30. obljetnice – 17.05.2025', excerpt: 'U subotu, 17. svibnja 2025., Kroatien Schwyz organizirala je izlet u jedan od najpoznatijih europskih zabavnih parkova – Europapark, u sklopu obilježavanja 30. obljetnice.' },
  { id: 3475, slug: 'godisnja-skupstina-2025', date: '2025-04-15T08:29:24Z', cat: 28, title: 'Godišnja skupština 2025', excerpt: 'Poštovani članovi HNK Kroatien Schwyz, s velikim zadovoljstvom vas pozivamo na godišnju skupštinu našeg kluba, koja će se održati u subotu, 07. lipnja 2025.' },
  { id: 3426, slug: '30-godina-hnk-kroatien-schwyz', date: '2025-02-28T11:17:07Z', cat: 1, title: '30 Godina HNK Kroatien Schwyz', excerpt: 'Dragi članovi i prijatelji, s ponosom se prisjećamo naše velike proslave 30. obljetnice Kroatien Schwyz! Hvala svima koji su svojim dolaskom učinili ovu proslavu nezaboravnom.' },
  { id: 3413, slug: 'izvjestaj-o-turniru-u-prstenu-ibach-22-02-2025', date: '2025-02-28T08:11:10Z', cat: 1, title: 'Prsten – Ibach, 22.02.2025.', excerpt: 'Dana 22. veljače 2025. godine u Ibachu je održan tradicionalni turnir u prstenu, koji je i ove godine okupio velik broj natjecatelja i ljubitelja ove tradicionalne igre.' },
  { id: 3405, slug: 'turnir-u-prstenu-2025', date: '2025-02-11T11:44:17Z', cat: 1, title: 'Turnir u Prstenu 2025', excerpt: 'HNK Kroatien Schwyz s ponosom organizira turnir u prstenu, tradicionalnoj igri koja okuplja mnoge zaljubljenike u sport i natjecanje.' },
  { id: 3332, slug: 'zabavna-vecer-2025', date: '2025-02-05T14:49:35Z', cat: 5, title: 'Zabavna Večer 2025', excerpt: 'Poštovani članovi i prijatelji HNK Kroatien Schwyz, u subotu, 1. veljače 2025., u Brunnenu smo proslavili 30. obljetnicu našeg kluba. Bila je to večer ispunjena radošću.' },
  { id: 3325, slug: 'pozivnica-za-izlet-u-europa-park', date: '2024-12-13T15:49:11Z', cat: 5, title: 'Pozivnica za Izlet u Europa-Park', excerpt: 'Dragi članovi, povodom proslave 30 godina postojanja našeg kluba, organiziramo jednodnevni izlet u Europa-Park u subotu, 17. svibnja 2025. godine.' },
  { id: 2991, slug: 'malonogometni-turnir-2024', date: '2024-11-29T09:40:22Z', cat: 1, title: 'Malonogometni Turnir 2024', excerpt: 'Dragi natjecatelji i cijenjeni gosti turnira, Hrvatski nogometni klub Kroatien Schwyz želi se iskreno zahvaliti svima koji su uveličali naš tradicionalni malonogometni turnir.' },
  { id: 2986, slug: 'malonogometni-turnir-23-11-2024', date: '2024-11-22T14:18:28Z', cat: 5, title: 'Pozivnica na malonogometni turnir', excerpt: 'Dragi prijatelji kluba, sa velikim zadovoljstvom vas obavještavamo da će se ove subote, 23.11.2024., održati malonogometni turnir u organizaciji našeg kluba. Mjesto: Dreifachhalle Allmig Oberarth.' },
  { id: 2933, slug: 'izvjestaj-sa-29-godisnje-skupstine-hnk-kroatien-schwyz', date: '2024-06-12T09:59:18Z', cat: 3, title: 'Izvještaj sa 29. godišnje skupštine HNK Kroatien Schwyz', excerpt: 'Datum i mjesto održavanja: 08.06.2024., Ibach. Broj nazočnih članova: 52. Predsjednik kluba, Robert Perković, pozdravio je prisutne članove te iznio izvještaj.' },
  { id: 2820, slug: 'pozivnica-na-godisnju-skupstinu-hnk-kroatien-sz', date: '2024-06-04T11:55:01Z', cat: 3, title: 'Pozivnica na godišnju skupštinu 2024', excerpt: 'Poštovani članovi HNK Kroatien Schwyz, s velikim zadovoljstvom vas pozivamo na godišnju skupštinu našeg kluba koja će se održati dana 08.06.2024. u crkvenoj sali.' },
  { id: 2879, slug: 'izlet-kluba-hnk-kroatien-schwyz-2024', date: '2024-05-24T08:17:29Z', cat: 1, title: 'Izlet Kluba HNK Kroatien Schwyz 2024', excerpt: 'Dragi članovi i prijatelji Kluba HNK Kroatien Schwyz, u subotu, 18. svibnja 2024., naš klub organizirao je nezaboravan izlet na sportskom igralištu u Muotathalu.' },
  { id: 2807, slug: 'zaprati-novi-kroatien-schwyz-whatsapp-kanal', date: '2024-03-12T13:55:29Z', cat: 28, title: 'Zaprati novi KROATIEN SCHWYZ Whatsapp kanal', excerpt: 'Obavještavamo sve simpatizere HNK Kroatien Schwyz da je klub otvorio novi kanal na WhatsApp-u! Pozivamo sve simpatizere da nam se pridruže na novom kanalu.' },
  { id: 2802, slug: 'pozivnica-na-izlet-s-clanovima-2024', date: '2024-03-11T17:12:07Z', cat: 5, title: 'Pozivnica na izlet za članove kluba!', excerpt: 'Poštovani članovi i dragi sponzori HNK Kroatien Schwyz, s veseljem smo vam poslali pozivnicu putem e-maila na ovogodišnji izlet svih članova i sponzora našeg kluba.' },
  { id: 2758, slug: 'nezaboravna-zabavna-vecer', date: '2024-02-09T17:28:20Z', cat: 5, title: 'Nezaboravna Zabavna Večer', excerpt: 'Dragi naši članovi i prijatelji, sa velikim zadovoljstvom želimo podijeliti s vama sjajne vijesti o našoj nedavnoj Zabavnoj Večeri koja se održala prošle subote, 03.02.2024.' },
  { id: 2711, slug: 'cestit-bozic', date: '2023-12-21T08:24:09Z', cat: 1, title: 'Sretan Božić i Blagoslovljena Nova 2024. Godina', excerpt: 'Dragi članovi, volonteri i prijatelji kluba, želimo iskoristiti ovu priliku da izrazimo duboku zahvalnost svima vama koji ste bili ključna podrška našem klubu tijekom protekle godine.' },
  { id: 2574, slug: 'zabavna-vecer-u-dvorani-aula-brunnen-za-sve-generacije', date: '2023-11-28T16:33:57Z', cat: 4, title: 'Zabavna Večer u dvorani Aula (Brunnen) – Za Sve Generacije!', excerpt: 'Dragi prijatelji, HNK Kroatien Schwyz vas poziva na Zabavnu Večer u Brunnenu 3. veljače 2024. Zabavljat će vas Jakov Juričević i Monty Bend.' },
  { id: 2540, slug: 'uspjesno-odrzan-malonogometni-turnir-u-ibachu-hvala-svima-na-podrsci', date: '2023-11-15T15:53:38Z', cat: 5, title: 'Uspješno održan Malonogometni Turnir u Ibachu – Hvala svima na podršci!', excerpt: 'Prošle subote, 11.11.2023., održan je sada već tradicionalni Malonogometni Turnir u sportskoj dvorani (MPS Schwyz) Ibach. Ova sportska manifestacija okupila je 28 ekipa.' },
  { id: 2064, slug: 'malonogometni-turnir-2023', date: '2023-09-07T17:27:11Z', cat: 28, title: 'Malonogometni Turnir 2023', excerpt: 'Poštovani klubovi, prijatelji i zaljubljenici u nogomet, sa zadovoljstvom vas pozivamo na naš tradicionalni Malonogometni Turnir, koji će se održati pod okriljem HNK Kroatien Schwyz.' },
  { id: 2040, slug: 'hrvatske-delicije-i-zajednistvo-zasjali-na-kulinarik-festivalu-u-brunnenu-hvala', date: '2023-08-21T15:01:28Z', cat: 28, title: 'Hrvatske Delicije i Zajedništvo Zasjali na Kulinarik Festivalu u Brunnenu. Hvala!', excerpt: 'Dragi članovi kluba i dragi posjetitelji, s radošću se obraćam svima vama kako bih izrazio duboku zahvalnost za izvanredno sudjelovanje našeg kluba na nedavnom festivalu.' },
  { id: 2030, slug: 'hrvatski-klub-odusevio-na-kulinarik-festivalu-202', date: '2023-08-21T11:28:52Z', cat: 28, title: 'Brunnen Kocht 2023.: Naš Klub U Središtu Pažnje', excerpt: 'S radošću dijelimo vijest o uspješnom sudjelovanju našeg kluba na ovogodišnjem Kulinarik Festivalu u Brunnenu. Naš štand je privukao veliku pažnju.' },
  { id: 1689, slug: 'druzenje-na-morschachu-s-clanovima-kluba', date: '2023-07-09T20:41:28Z', cat: 28, title: 'Druženje na Morschachu s članovima Kluba', excerpt: 'U subotu 01.07.2023 smo imali nevjerojatno lijep dan na Morschachu s našim dragim članovima Kluba Kroatien Schwyz! Okupili smo se kako bismo zajedno uživali.' },
  { id: 40, slug: 'novi-dresovi-kroatie-schwyz', date: '2023-07-09T12:33:23Z', cat: 28, title: 'Novi dresovi', excerpt: 'HNK Kroatien Schwyz, s ponosom predstavlja svoju najnoviju investiciju – nove dresove koji će predstavljati naše igrače. Zahvaljujući velikodušnosti naših sponzora.' },
  { id: 43, slug: 'brunnen-kocht-2023', date: '2023-07-09T10:52:28Z', cat: 28, title: 'Posjetite štand našeg Kluba na kulinarik festivalu «Brunnen kocht»', excerpt: 'Dragi posjetitelji, s ponosom vas obavještavamo da će naš Klub i ove godine sudjelovati na poznatom kulinarik festivalu «Brunnen kocht» koji će se održati u subotu, 19.08.2023.' },
  { id: 1777, slug: 'povjest-hnk-kroatien-schwyz', date: '2023-07-06T21:44:28Z', cat: 28, title: 'Povijest HNK Kroatien Schwyz', excerpt: 'Dobrodošli na web stranicu HNK Kroatien Schwyz! Ovdje ćete pronaći sve informacije o našem klubu i njegovoj bogatoj povijesti, kao i našim trenutnim aktivnostima i budućim planovima.' },
  { id: 35, slug: 'redizajn', date: '2023-06-27T13:57:31Z', cat: 28, title: 'Obnova web stranice i redizajn loga pod vodstvom Danijela', excerpt: 'Napredak u nogometu počinje s obnovom. Naš Klub je dobio svježe lice zahvaljujući novom članu upravnog odbora i strastvenom zaljubljeniku u nogomet, Danijelu Ponjaviću (Dani).' },
  { id: 1962, slug: 'turnir-prstena-2023', date: '2023-03-04T11:05:00Z', cat: 28, title: 'Turnir Prstena 2023', excerpt: 'Dragi prijatelji, nakon tri godine pauze zbog pandemije koronavirusa, ponovno smo se okupili da se zajedno družimo i igramo na našem tradicionalnom turniru Prstena.' },
];

// ---- build docs ------------------------------------------------------------
const docs = [];

for (const p of posts) {
  const title = decode(p.title);
  const excerpt = decode(p.excerpt);
  docs.push({
    _type: 'novost',
    _id: `novost-wp-${p.id}`,
    title: locStr(title),
    slug: slugField(p.slug),
    date: p.date,
    category: CAT[p.cat] || 'Novosti',
    excerpt: locText(excerpt),
    body: ptBlock(excerpt),
  });
}

// Static pages — placeholders (live content is page-builder/shortcode, not in REST)
const pages = [
  { slug: 'o-nama', hr: 'O nama', de: 'Über uns' },
  { slug: 'klub', hr: 'Klub', de: 'Verein' },
  { slug: 'postani-clan', hr: 'Postani član', de: 'Mitglied werden' },
  { slug: 'kontakt', hr: 'Kontakt', de: 'Kontakt' },
  { slug: 'impressum', hr: 'Impressum', de: 'Impressum' },
  { slug: 'datenschutzerklarung', hr: 'Datenschutzerklärung', de: 'Datenschutzerklärung' },
];
for (const pg of pages) {
  docs.push({
    _type: 'stranica',
    _id: `stranica-${pg.slug}`,
    title: { _type: 'localeString', hr: pg.hr, de: pg.de },
    slug: slugField(pg.slug),
  });
}

// Teams — starter docs
const teams = [
  { slug: 'aktivni', hr: 'Aktivni', de: 'Aktive', order: 10 },
  { slug: 'seniori', hr: 'Seniori', de: 'Senioren', order: 20 },
  { slug: 'juniori-u16', hr: 'Juniori U16', de: 'Junioren U16', order: 30 },
  { slug: 'juniori-u12', hr: 'Juniori U12', de: 'Junioren U12', order: 40 },
];
for (const tm of teams) {
  docs.push({
    _type: 'momcad',
    _id: `momcad-${tm.slug}`,
    name: { _type: 'localeString', hr: tm.hr, de: tm.de },
    slug: slugField(tm.slug),
    order: tm.order,
  });
}

// Sponsors — seeded with the real local logo files (reachable during import)
const sponsors = [
  { slug: 'croaticum', name: 'Croaticum', file: 'croaticum.png', pkg: 'Premium', order: 10 },
  { slug: 'masada-swiss', name: 'Masada Swiss', file: 'masada-swiss.png', pkg: 'Premium', order: 20 },
  { slug: 'autocenter-goldau', name: 'Autocenter Goldau AG', file: 'autocenter-goldau.png', pkg: 'Standard', order: 30 },
  { slug: 'hsl-ag', name: 'HSL AG', file: 'hsl-ag.svg', pkg: 'Standard', order: 40 },
  { slug: 'plan-a', name: 'PlanA AG Gebäudetechnik', file: 'plan-a.svg', pkg: 'Standard', order: 50 },
];
for (const sp of sponsors) {
  docs.push({
    _type: 'sponzor',
    _id: `sponzor-${sp.slug}`,
    name: sp.name,
    package: sp.pkg,
    order: sp.order,
    logo: {
      _type: 'image',
      _sanityAsset: `image@file://${resolve(ROOT, 'public/assets/sponsors', sp.file)}`,
    },
  });
}

// ---- write -----------------------------------------------------------------
const ndjson = docs.map((d) => JSON.stringify(d)).join('\n') + '\n';
writeFileSync(resolve(__dirname, 'import.ndjson'), ndjson);
console.log(
  `Wrote ${docs.length} docs → migration/import.ndjson ` +
    `(${posts.length} novost, ${pages.length} stranica, ${teams.length} momcad, ${sponsors.length} sponzor)`,
);
