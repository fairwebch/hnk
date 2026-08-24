// Seeds the postavke-sajta singleton with the chosen hero photos.
// The images reference EXISTING gallery assets (no re-upload):
//   1. Zabavna večer 2024 — dance floor, elevated wide shot
//   2. Film "DIVA" 2025 — full hall with balcony
//   3. Malonogometni turnir 2023 — action shot in checkered kit
// Run: SANITY_WRITE_TOKEN=... node scripts/migration/seed-postavke-sajta.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN =
  process.env.SANITY_WRITE_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();

const HERO_ASSETS = [
  'image-9c1af429917fbd6789c7cb1c617fbce0e3631640-1600x1200-webp',
  'image-81b6999dee4c6a9d8fbdfc1af47854b8eade1af4-1800x1198-webp',
  'image-2b41ce66c1ce36654c36f800334753360ac2c594-1800x1013-webp',
];

const doc = {
  _id: 'postavke-sajta',
  _type: 'postavkeSajta',
  heroSlike: HERO_ASSETS.map((id, i) => ({
    _type: 'image',
    _key: `hero${i + 1}`,
    asset: { _type: 'reference', _ref: id },
  })),
};

const res = await fetch('https://jxoy4fyb.api.sanity.io/v2024-01-01/data/mutate/production', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ mutations: [{ createOrReplace: doc }] }),
});
console.log(res.status, JSON.stringify(await res.json()).slice(0, 150));
