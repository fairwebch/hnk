// Seeds team group photos + name rows scraped from the old site, and
// consolidates the two empty junior placeholders into a single "Juniori"
// team (the old site has exactly one juniors squad).
// Run: node scripts/migration/seed-momcadi.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = process.env.SANITY_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();
const API = 'https://jxoy4fyb.api.sanity.io/v2024-01-01/data/mutate/production';

const IMG = {
  aktivni: 'image-3f9329b648d4968442413c2b3b463d7f9b76e44d-2000x1125-webp',
  seniori: 'image-d909fae8acbb675b1cd2d1f2524d5c93ecd61fbe-2000x1125-webp',
  juniori: 'image-4c4993424d53840a697f63384e1b0e45a97cbce0-2000x1125-webp',
};

let k = 0;
const key = () => `k${++k}`;
const foto = (ref) => ({ _type: 'image', asset: { _type: 'reference', _ref: ref } });
const red = (hr, de, imena) => ({
  _type: 'redImena', _key: key(),
  oznakaReda: { _type: 'localeString', hr, de },
  imena,
});

// Name rows verbatim from the old site (incl. the literal "*" for one
// unnamed player in the Aktivni bottom row).
const mutations = [
  { patch: { id: 'momcad-aktivni', set: {
    grupnaFotografija: foto(IMG.aktivni),
    popisImena: [
      red('Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Darijo, Andre, Marko, Dario'),
      red('Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Ivan, *, Marko, Josip'),
    ],
  } } },
  { patch: { id: 'momcad-seniori', set: {
    grupnaFotografija: foto(IMG.seniori),
    popisImena: [
      red('Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Denis, Nikola, Josip, Ilica, Elvis'),
      red('Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Ilija, Robert, Ivan'),
      red('Nisu na slici', 'Nicht auf dem Bild', 'Burdo, Dani'),
    ],
  } } },
  { createOrReplace: {
    _id: 'momcad-juniori',
    _type: 'momcad',
    name: { _type: 'localeString', hr: 'Juniori', de: 'Junioren' },
    slug: { _type: 'slug', current: 'juniori' },
    order: 30,
    grupnaFotografija: foto(IMG.juniori),
    popisImena: [
      red('Gornji red s lijeva na desno', 'Obere Reihe von links nach rechts', 'Josip, Lian, Darijo, Ilijan, Iven'),
      red('Donji red s lijeva na desno', 'Untere Reihe von links nach rechts', 'Keny, Amar, Alen, Petar, Leon, Ivan, Leny'),
    ],
  } },
  { delete: { id: 'momcad-juniori-u16' } },
  { delete: { id: 'momcad-juniori-u12' } },
];

const res = await fetch(API, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ mutations }),
});
console.log(res.status, JSON.stringify(await res.json()).slice(0, 250));
