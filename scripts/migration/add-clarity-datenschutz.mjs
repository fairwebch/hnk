// Inserts a "Microsoft Clarity" section into the Datenschutzerklärung
// (stranica-datenschutzerklarung, hr + de), directly after "11. Google
// Analytics". Later sections are renumbered (12→13 … 16→17) and the two
// cross-references to the Maps section ("t. 12" / "Ziff. 12") follow. Run:
//   SANITY_TOKEN=... node scripts/migration/add-clarity-datenschutz.mjs
const TOKEN = process.env.SANITY_TOKEN;
if (!TOKEN) throw new Error('SANITY_TOKEN missing');
const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'jxoy4fyb';
const BASE = `https://${PROJECT}.api.sanity.io/v2024-01-01/data`;
const DOC_ID = 'stranica-datenschutzerklarung';

let k = 0;
const key = () => `clr${++k}`;
const span = (text, marks = []) => ({ _type: 'span', _key: key(), text, marks });
// P(...parts): string | {b:text} bold | {a:[text, href]} link
const P = (...parts) => {
  const markDefs = [];
  const children = parts.map((p) => {
    if (typeof p === 'string') return span(p);
    if (p.b !== undefined) return span(p.b, ['strong']);
    const id = key();
    markDefs.push({ _type: 'link', _key: id, href: p.a[1] });
    return span(p.a[0], [id]);
  });
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children };
};
const H3 = (t) => ({ _type: 'block', _key: key(), style: 'h3', markDefs: [], children: [span(t)] });

const MS_PRIV = { a: ['Microsoft Privacy Statement', 'https://privacy.microsoft.com/de-de/privacystatement'] };
const MS_DOCS = 'https://learn.microsoft.com/en-us/clarity/faq';

const clarityHr = [
  H3('12. Microsoft Clarity'),
  P(
    'Naša stranica koristi Microsoft Clarity, uslugu analize ponašanja korisnika tvrtke ',
    { b: 'Microsoft Ireland Operations Limited' },
    ', One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irska.',
  ),
  P(
    'Clarity nam pomaže razumjeti kako posjetitelji koriste stranicu putem anonimiziranih snimaka sesija i toplinskih mapa (heatmap). Podaci se prikupljaju isključivo uz vašu privolu (kategorija «Statistika») i uključuju kolačiće _clck i _clsk, koji se pohranjuju do 13 mjeseci. Bez privole usluga se ne učitava i nikakvi se podaci ne prenose Microsoftu.',
  ),
  P(
    'Više informacija: ',
    MS_PRIV,
    ' i ',
    { a: ['Clarity dokumentacija', MS_DOCS] },
    '. Svoju privolu možete povući u bilo kojem trenutku putem poveznice «Postavke kolačića» u podnožju stranice.',
  ),
];

const clarityDe = [
  H3('12. Microsoft Clarity'),
  P(
    'Diese Website nutzt Microsoft Clarity, einen Dienst zur Analyse des Nutzerverhaltens von ',
    { b: 'Microsoft Ireland Operations Limited' },
    ', One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland.',
  ),
  P(
    'Clarity hilft uns zu verstehen, wie Besucher die Website nutzen, durch anonymisierte Sitzungsaufzeichnungen und Heatmaps. Die Datenerhebung erfolgt ausschliesslich mit Ihrer Einwilligung (Kategorie «Statistik») und umfasst die Cookies _clck und _clsk, die bis zu 13 Monate gespeichert werden. Ohne Einwilligung wird der Dienst nicht geladen und es werden keine Daten an Microsoft übertragen.',
  ),
  P(
    'Weitere Informationen: ',
    MS_PRIV,
    ' und ',
    { a: ['Clarity-Dokumentation', MS_DOCS] },
    '. Sie können Ihre Einwilligung jederzeit über den Link «Cookie-Einstellungen» im Footer widerrufen.',
  ),
];

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('');

function transform(blocks, clarityBlocks, refFrom, refTo) {
  const idx = blocks.findIndex((b) => b.style === 'h3' && blockText(b).startsWith('12. '));
  if (idx === -1) throw new Error('heading "12." not found');
  const out = blocks.map((b) => {
    // Renumber headings 12–16 → 13–17.
    if (b.style === 'h3') {
      const m = blockText(b).match(/^(1[2-6])\. /);
      if (m) {
        const n = Number(m[1]);
        return {
          ...b,
          children: b.children.map((c, i) =>
            i === 0 ? { ...c, text: c.text.replace(/^1[2-6]\. /, `${n + 1}. `) } : c,
          ),
        };
      }
    }
    // Follow the cross-reference to the (former) section 12.
    if (blockText(b).includes(refFrom)) {
      return {
        ...b,
        children: b.children.map((c) =>
          c.text?.includes(refFrom) ? { ...c, text: c.text.replaceAll(refFrom, refTo) } : c,
        ),
      };
    }
    return b;
  });
  out.splice(idx, 0, ...clarityBlocks);
  return out;
}

const q = encodeURIComponent(`*[_id=="${DOC_ID}"][0]{body}`);
const res = await fetch(`${BASE}/query/production?query=${q}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const { result } = await res.json();
if (!result?.body?.hr || !result?.body?.de) throw new Error('body.hr/de missing');

if (result.body.hr.some((b) => blockText(b).includes('Microsoft Clarity'))) {
  console.log('Clarity section already present — nothing to do.');
  process.exit(0);
}

const newHr = transform(result.body.hr, clarityHr, '(vidi t. 12)', '(vidi t. 13)');
const newDe = transform(result.body.de, clarityDe, '(siehe Ziff. 12)', '(siehe Ziff. 13)');

const mut = await fetch(`${BASE}/mutate/production`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({
    mutations: [{ patch: { id: DOC_ID, set: { 'body.hr': newHr, 'body.de': newDe } } }],
  }),
});
const out = await mut.json();
if (!mut.ok) throw new Error(JSON.stringify(out));
console.log('OK', JSON.stringify(out.results?.map((r) => r.id)));
console.log(`hr: ${result.body.hr.length} → ${newHr.length} blokova, de: ${result.body.de.length} → ${newDe.length}`);
