/**
 * Refresh club-shop data from 11teamsports.
 *
 * Runs in CI (GitHub Actions). 11teamsports sits behind Cloudflare's JS
 * challenge, so a plain fetch is blocked — we drive a real Chromium
 * (Playwright, headed under xvfb) which passes the challenge, then read the
 * product's JSON-LD. Images are pulled through the weserv.nl image proxy and
 * stored locally.
 *
 * Fail-safe: if ANY product cannot be scraped (Cloudflare block, layout
 * change, product removed, missing price/image…), NOTHING is written and the
 * process exits non-zero — the site keeps serving the last known-good data.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'lib/shop.data.json');
const IMG_DIR = path.join(ROOT, 'public/assets/shop');
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

async function scrapeProduct(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // Wait for the Cloudflare interstitial to clear and product markup to appear.
  await page.waitForFunction(
    () => {
      if (/just a moment|attention required|verifying you are human/i.test(document.title)) return false;
      return (
        !!document.querySelector('script[type="application/ld+json"]') ||
        !!document.querySelector('meta[property="og:title"]')
      );
    },
    { timeout: 45_000 },
  );
  await sleep(500);

  const d = await page.evaluate(() => {
    const res = { name: null, price: null, currency: null, image: null };
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      let j;
      try {
        j = JSON.parse(s.textContent);
      } catch {
        continue;
      }
      const nodes = Array.isArray(j) ? j : j['@graph'] || [j];
      for (const n of nodes) {
        if (!n) continue;
        const types = [].concat(n['@type'] || []);
        if (!types.includes('Product')) continue;
        if (n.name) res.name = n.name;
        let off = n.offers;
        if (Array.isArray(off)) off = off[0];
        if (off) {
          if (off.price != null) res.price = String(off.price);
          if (off.priceCurrency) res.currency = off.priceCurrency;
          // offers can nest a priceSpecification
          if (off.priceSpecification) {
            const ps = Array.isArray(off.priceSpecification) ? off.priceSpecification[0] : off.priceSpecification;
            if (ps?.price != null && res.price == null) res.price = String(ps.price);
            if (ps?.priceCurrency && !res.currency) res.currency = ps.priceCurrency;
          }
        }
        let img = n.image;
        if (Array.isArray(img)) img = img[0];
        if (img) res.image = typeof img === 'string' ? img : img.url;
      }
    }
    const meta = (p) => document.querySelector(`meta[property="${p}"]`)?.getAttribute('content') || null;
    if (!res.name) res.name = meta('og:title') || document.querySelector('h1')?.textContent?.trim() || null;
    if (!res.image) res.image = meta('og:image');
    return res;
  });

  if (!d.name || !d.price || !d.image) {
    throw new Error(
      `incomplete data (name=${d.name ? 'ok' : 'MISSING'} price=${d.price ? 'ok' : 'MISSING'} image=${d.image ? 'ok' : 'MISSING'})`,
    );
  }
  const num = Number(String(d.price).replace(/[^0-9.,]/g, '').replace(',', '.'));
  if (!Number.isFinite(num) || num <= 0) throw new Error(`bad price "${d.price}"`);
  const currency = (d.currency || 'CHF').replace('CHF', 'CHF');
  return { name: d.name.trim().replace(/\s+/g, ' '), price: `${currency} ${num.toFixed(2)}`, imageUrl: d.image };
}

async function fetchImage(imageUrl) {
  // Strip scheme + Cloudflare image-resizing prefix, then pull via weserv.nl.
  const plain = imageUrl.replace(/^https?:\/\//, '').replace(/cdn-cgi\/image\/[^/]*\//, '');
  const proxied = `https://images.weserv.nl/?url=ssl:${encodeURI(plain)}&w=900&output=jpg&q=82`;
  const res = await fetch(proxied, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`image proxy HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`image too small (${buf.length}B)`);
  return buf;
}

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ userAgent: UA, locale: 'de-CH', viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

const errors = [];
const scraped = [];
for (const p of data.products) {
  try {
    const s = await scrapeProduct(page, p.url);
    const buf = await fetchImage(s.imageUrl);
    scraped.push({ slug: p.slug, name: s.name, price: s.price, buf });
    console.log(`OK   ${p.slug} :: ${s.name} | ${s.price} | image ${(buf.length / 1024) | 0}KB`);
  } catch (e) {
    errors.push(`${p.slug}: ${e.message}`);
    console.error(`FAIL ${p.slug} :: ${e.message}`);
  }
  await sleep(1500);
}
await browser.close();

if (errors.length) {
  console.error(`\n✖ Scrape failed for ${errors.length}/${data.products.length} product(s):`);
  errors.forEach((e) => console.error(`   - ${e}`));
  console.error('Existing shop data left UNCHANGED. Site keeps serving last known-good data.');
  process.exit(1);
}

// All 7 scraped OK — apply only genuine changes.
let changes = 0;
for (const r of scraped) {
  const p = data.products.find((x) => x.slug === r.slug);
  if (p.name !== r.name) {
    console.log(`~ ${r.slug} name: "${p.name}" -> "${r.name}"`);
    p.name = r.name;
    changes++;
  }
  if (p.price !== r.price) {
    console.log(`~ ${r.slug} price: ${p.price} -> ${r.price}`);
    p.price = r.price;
    changes++;
  }
  const file = path.join(IMG_DIR, `${r.slug}.jpg`);
  const existing = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (!existing || sha(existing) !== sha(r.buf)) {
    fs.writeFileSync(file, r.buf);
    console.log(`~ ${r.slug} image updated`);
    changes++;
  }
}

if (changes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n✔ Updated ${changes} field(s). shop.data.json rewritten.`);
} else {
  console.log('\n✔ All 7 products scraped — no changes, data already up to date.');
}
