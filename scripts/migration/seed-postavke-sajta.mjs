// Seeds the postavke-sajta singleton with the chosen hero photos.
// Dedicated hero assets, re-encoded from the old site's NextGEN *_backup
// originals at max 2560px, WebP q82:
//   1. Zabavna večer 2024 — dance floor (from 4032×3024 original)
//   2. Film "DIVA" 2025 — full hall (from 6048×4024 original)
//   3. Malonogometni turnir 2023 — action shot (from 2048×1152 original)
// Run: SANITY_WRITE_TOKEN=... node scripts/migration/seed-postavke-sajta.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN =
  process.env.SANITY_WRITE_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();

const HERO_ASSETS = [
  'image-130db2e28725913279e5534623692da721a81059-2560x1920-webp',
  'image-96ff256f5d5797b9f1855ec538fd53367cb7eaf3-2560x1703-webp',
  'image-4908c912fa0521607c511d4d1840cc7e1bb61146-2048x1152-webp',
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
