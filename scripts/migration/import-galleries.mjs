// Gallery migration: NextGEN (old WordPress) -> Sanity.
// Resumable: progress is persisted to import-state.json after every image,
// so a rerun continues where it stopped. Run from the repo root:
//   SANITY_TOKEN=sk... node scripts/migration/import-galleries.mjs
// Optional: DRY_RUN=1 (no uploads/mutations), ONLY=<slug>, LIMIT_ALBUMS=<n>
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const INVENTORY = JSON.parse(readFileSync(path.join(DIR, 'inventory.json')));
const STATE_FILE = path.join(DIR, process.env.DRY_RUN ? 'import-state.dry.json' : 'import-state.json');
const LOG_FILE = path.join(DIR, 'import.log');
const SAMPLES_DIR = path.join(DIR, 'samples');

const PROJECT = 'jxoy4fyb';
const DATASET = 'production';
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01`;
const TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_WRITE_TOKEN;
const DRY = !!process.env.DRY_RUN;
const ONLY = process.env.ONLY;
const LIMIT_ALBUMS = Number(process.env.LIMIT_ALBUMS || 0);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_DIM = 2000;
const WEBP_Q = 80;
const JPEG_Q = 80;

if (!TOKEN && !DRY) {
  console.error('SANITY_TOKEN missing (set env var, or DRY_RUN=1 for a dry run)');
  process.exit(1);
}

const YEAR_OVERRIDES = { 'film-diva': 2025 }; // no year in title; upload ts + album position => 2025

// Croatian display-name cleanup (case/diacritics only, content unchanged).
const HR_NAMES = {
  'malonogometni-turnir-2024': 'Malonogometni turnir 2024',
  'malonogometni-turnir-2023': 'Malonogometni turnir 2023',
  'zabavna-vecer-2026': 'Zabavna večer 2026',
  'zabavna-vecer-2025': 'Zabavna večer 2025',
  'zabavna-vecer-2024': 'Zabavna večer 2024',
  'zabava-9-februara-2008': 'Zabava 9. februara 2008',
  'zabava-19-novembra-2006': 'Zabava 19. novembra 2006',
};

// German names — Swiss spelling (ss, never ß).
function deName(slug, hrName, year) {
  if (slug.startsWith('malonogometni-turnir')) return `Fussballturnier ${year}`;
  if (slug.startsWith('turnir-prstena')) return `Prsten-Turnier ${year}`;
  if (slug.startsWith('prsten')) return `Prsten ${year}`;
  if (slug.startsWith('zabavna-vecer')) return `Festabend ${year}`;
  if (slug.startsWith('europapark')) return `Europapark ${year}`;
  if (slug.startsWith('izlet-u-muotathal')) return `Ausflug nach Muotathal ${year}`;
  if (slug.startsWith('grill-morschach')) return `Grillfest Morschach ${year}`;
  if (slug.startsWith('godisnja-skupstina')) return `Generalversammlung ${year}`;
  if (slug.startsWith('dan-zena')) return `Frauentag ${year}`;
  if (slug.startsWith('ljetna-zabava')) return `Sommerfest ${year}`;
  if (slug.startsWith('proljetna-zabava')) return `Frühlingsfest ${year}`;
  if (slug.startsWith('bozicna-vecera')) return `Weihnachtsessen ${year}`;
  if (slug === 'film-diva') return 'Film "DIVA"';
  if (slug === 'zabava-9-februara-2008') return 'Fest vom 9. Februar 2008';
  if (slug === 'zabava-19-novembra-2006') return 'Fest vom 19. November 2006';
  return hrName; // fallback: original name
}

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE))
  : { albums: {}, hashes: {}, failed: [], uploadedBytes: 0, originalBytes: 0 };
const saveState = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));

async function download(url, tries = 3) {
  for (let a = 1; a <= tries; a++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (a === tries) throw e;
      await sleep(2000 * a);
    }
  }
}

async function convert(buf) {
  const base = sharp(buf, { failOn: 'none' })
    .rotate() // bake EXIF orientation into pixels BEFORE metadata is stripped
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
  try {
    return { out: await base.webp({ quality: WEBP_Q }).toBuffer(), ext: 'webp', mime: 'image/webp' };
  } catch {
    return { out: await base.jpeg({ quality: JPEG_Q, mozjpeg: true }).toBuffer(), ext: 'jpg', mime: 'image/jpeg' };
  }
}

async function uploadAsset(buf, filename, mime, tries = 3) {
  for (let a = 1; a <= tries; a++) {
    const res = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': mime },
      body: buf,
    });
    if (res.ok) return (await res.json()).document._id;
    const txt = await res.text();
    if (a === tries) throw new Error(`upload ${res.status}: ${txt.slice(0, 200)}`);
    await sleep(3000 * a);
  }
}

async function mutate(mutations, tries = 3) {
  for (let a = 1; a <= tries; a++) {
    const res = await fetch(`${API}/data/mutate/${DATASET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ mutations }),
    });
    if (res.ok) return res.json();
    const txt = await res.text();
    if (a === tries) throw new Error(`mutate ${res.status}: ${txt.slice(0, 200)}`);
    await sleep(3000 * a);
  }
}

// Order: newest first, so the most relevant albums land even if quota bites.
const albums = INVENTORY.albums
  .map((a) => ({ ...a, year: YEAR_OVERRIDES[a.slug] ?? a.year }))
  .filter((a) => (ONLY ? a.slug === ONLY : true))
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
const list = LIMIT_ALBUMS ? albums.slice(0, LIMIT_ALBUMS) : albums;

log(`=== import start (dry=${DRY}) — ${list.length} albums, params: max ${MAX_DIM}px, webp q${WEBP_Q} ===`);
if (DRY) mkdirSync(SAMPLES_DIR, { recursive: true });

let cumUploaded = state.uploadedBytes || 0;
for (const al of list) {
  const st = (state.albums[al.slug] ??= { images: {}, done: false });
  if (st.done) {
    log(`SKIP ${al.slug} (already done, ${Object.keys(st.images).length} images)`);
    continue;
  }

  // Cover first, then site order.
  const ordered = [...al.images];
  if (al.cover_file) {
    const ci = ordered.findIndex((i) => i.file === al.cover_file);
    if (ci > 0) ordered.unshift(ordered.splice(ci, 1)[0]);
    else if (ci === -1) log(`  note: cover ${al.cover_file} not found among images of ${al.slug}`);
  }

  let albumIn = 0, albumOut = 0, ok = 0, failed = 0, sampleSaved = 0;
  for (const im of ordered) {
    if (st.images[im.file]) { ok++; continue; } // resumed
    try {
      const orig = await download(im.url);
      const { out, ext, mime } = await convert(orig);
      const hash = createHash('sha256').update(out).digest('hex');
      let assetId = state.hashes[hash];
      const filename = im.file.replace(/\.(jpe?g|png|gif)$/i, '') + '.' + ext;
      if (DRY) {
        assetId = `dry-${hash.slice(0, 12)}`;
        if (sampleSaved < 3) {
          writeFileSync(path.join(SAMPLES_DIR, `${al.slug}-${filename}`), out);
          sampleSaved++;
        }
      } else if (!assetId) {
        assetId = await uploadAsset(out, filename, mime);
      }
      state.hashes[hash] = assetId;
      st.images[im.file] = assetId;
      albumIn += orig.length;
      albumOut += out.length;
      state.originalBytes += orig.length;
      if (!DRY) state.uploadedBytes += out.length;
      ok++;
      saveState();
      await sleep(250);
    } catch (e) {
      failed++;
      state.failed.push({ album: al.slug, file: im.file, url: im.url, error: String(e.message || e) });
      log(`  FAIL ${al.slug}/${im.file}: ${e.message || e}`);
      saveState();
      await sleep(1000);
    }
  }

  // Build the document (skip failed images; order preserved).
  const refs = ordered
    .map((im) => st.images[im.file])
    .filter(Boolean)
    .map((id, i) => ({ _type: 'image', _key: `k${i}-${String(id).slice(-8)}`, asset: { _type: 'reference', _ref: id } }));

  const hrName = HR_NAMES[al.slug] || al.title.replace(/&quot;/g, '"');
  const doc = {
    _id: `galerija-${al.slug}`,
    _type: 'galerija',
    name: { _type: 'localeString', hr: hrName, de: deName(al.slug, hrName, al.year) },
    slug: { _type: 'slug', current: al.slug },
    kategorija: al.cat_key,
    godina: al.year,
    date: `${al.year}-01-01`,
    images: refs,
  };
  if (!DRY) await mutate([{ createOrReplace: doc }]);
  st.done = true;
  st.docId = doc._id;
  saveState();

  cumUploaded = state.uploadedBytes;
  log(
    `ALBUM ${al.slug} (${al.year}): ${ok}/${al.images.length} images` +
    (failed ? ` (${failed} FAILED)` : '') +
    ` | in ${(albumIn / 1e6).toFixed(1)} MB -> out ${(albumOut / 1e6).toFixed(1)} MB` +
    ` | total uploaded so far: ${(cumUploaded / 1e6).toFixed(1)} MB`,
  );
  await sleep(1500);
}

log(`=== DONE. albums=${list.length}, uploaded=${(state.uploadedBytes / 1e6).toFixed(1)} MB, ` +
    `originals=${(state.originalBytes / 1e6).toFixed(1)} MB, failed=${state.failed.length} ===`);
if (state.failed.length) {
  log('Failed images:');
  for (const f of state.failed) log(`  - ${f.album}/${f.file}: ${f.error}`);
}
