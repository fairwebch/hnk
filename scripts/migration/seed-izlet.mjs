// Seeds the Europapark check-in data (izletPostavke + izletPutnik docs).
// Target dataset defaults to the PRIVATE `prijave` dataset. Usage:
//   SANITY_WRITE_TOKEN=... node scripts/migration/seed-izlet.mjs --kod=ep-XXXX [--dataset=prijave]
// Re-running resets all seeded putnik-NNN docs to the JSON state
// (createOrReplace) and leaves any putnik-c-* docs (added on the spot) alone.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const TOKEN =
  process.env.SANITY_WRITE_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();
const DATASET = args.dataset || 'prijave';
const KOD = args.kod;
if (!KOD) {
  console.error('Missing --kod=...');
  process.exit(1);
}

const data = JSON.parse(readFileSync(path.join(DIR, 'europapark-putnici.json'), 'utf8'));

const docs = [
  {
    _id: 'izlet-europapark',
    _type: 'izletPostavke',
    naziv: data.izlet || 'Europapark',
    aktivan: true,
    kod: KOD,
  },
  ...data.putnici.map((p, i) => ({
    _id: `putnik-${String(i + 1).padStart(3, '0')}`,
    _type: 'izletPutnik',
    ime: p.ime,
    kategorija: p.kategorija,
    prijevoz: p.prijevoz,
    placeno: Boolean(p.placeno),
    dosao: false,
  })),
];

const res = await fetch(`https://jxoy4fyb.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ mutations: docs.map((d) => ({ createOrReplace: d })) }),
});
const json = await res.json();
console.log(res.status, res.ok ? `seeded ${docs.length} docs into "${DATASET}"` : JSON.stringify(json).slice(0, 300));
