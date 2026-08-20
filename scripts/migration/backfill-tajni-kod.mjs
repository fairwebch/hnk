// One-off: sets a random tajniKod on every dogadjaj that doesn't have one,
// so member-only links work for events created before the prijave feature.
//   SANITY_TOKEN=... node scripts/migration/backfill-tajni-kod.mjs
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = process.env.SANITY_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();
const BASE = 'https://jxoy4fyb.api.sanity.io/v2024-01-01/data';

const code = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(randomBytes(10), (b) => chars[b % chars.length]).join('');
};

const q = encodeURIComponent('*[_type == "dogadjaj" && !defined(tajniKod)]{_id}');
const res = await fetch(`${BASE}/query/production?query=${q}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const ids = (await res.json()).result.map((d) => d._id);
if (!ids.length) {
  console.log('Nothing to backfill.');
  process.exit(0);
}
const mutations = ids.map((id) => ({ patch: { id, set: { tajniKod: code() } } }));
const m = await fetch(`${BASE}/mutate/production`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ mutations }),
});
console.log(m.status, `patched ${ids.length} events`);
