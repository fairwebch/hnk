// One-off cleanup for the /uprava redesign:
//  - the four shared grey-silhouette placeholders are unset (the initials
//    tile takes over; the asset itself stays in the media library)
//  - German role names are filled in (role.de was empty everywhere)
//  - the four leadership roles get a one-line localized `zaduzenje`
// Idempotent. Run:  SANITY_TOKEN=... node scripts/migration/uprava-uredjenje.mjs
const TOKEN = process.env.SANITY_TOKEN;
if (!TOKEN) throw new Error('SANITY_TOKEN missing');
const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'jxoy4fyb';
const BASE = `https://${PROJECT}.api.sanity.io/v2024-01-01/data`;

const ROLE_DE = {
  'Predsjednik': 'Präsident',
  'Dopredsjednik': 'Vizepräsident',
  'Tajnik': 'Schriftführer',
  'Blagajnik': 'Kassier',
  'Sportski direktor': 'Sportdirektor',
  'Član Upravnog odbora': 'Vorstandsmitglied',
};
const ZADUZENJE = {
  'Dopredsjednik': { hr: 'Zamjena predsjednika i vanjski odnosi', de: 'Stellvertretung des Präsidenten und Aussenbeziehungen' },
  'Tajnik': { hr: 'Administracija i članstvo', de: 'Administration und Mitgliederwesen' },
  'Blagajnik': { hr: 'Financije i članarine', de: 'Finanzen und Mitgliederbeiträge' },
  'Sportski direktor': { hr: 'Momčadi i natjecanje', de: 'Mannschaften und Spielbetrieb' },
};

const q = encodeURIComponent('*[_type=="clanUprave"]{_id, name, "roleHr": role.hr, "img": image.asset._ref}');
const res = await fetch(`${BASE}/query/production?query=${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
const { result } = await res.json();

// the shared silhouette = any asset ref used by more than one member
const counts = {};
for (const m of result) if (m.img) counts[m.img] = (counts[m.img] ?? 0) + 1;
const silhouettes = new Set(Object.keys(counts).filter((k) => counts[k] > 1));
console.log('dijeljeni (silueta) asseti:', [...silhouettes].map((s) => s.slice(0, 30)));

const mutations = [];
for (const m of result) {
  const set = { 'role.de': ROLE_DE[m.roleHr] ?? m.roleHr };
  const z = ZADUZENJE[m.roleHr];
  if (z) set['zaduzenje'] = { _type: 'localeString', hr: z.hr, de: z.de };
  const patch = { id: m._id, set };
  if (m.img && silhouettes.has(m.img)) patch.unset = ['image'];
  mutations.push({ patch });
}
const mut = await fetch(`${BASE}/mutate/production`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ mutations }),
});
const out = await mut.json();
if (!mut.ok) throw new Error(JSON.stringify(out));
console.log(`OK — ${mutations.length} zapisa ažurirano, ${result.filter((m) => m.img && silhouettes.has(m.img)).length} silueta maknuto`);
