// Seeds the "klubStranica" singleton (club history timeline, hr + de-CH)
// and removes the obsolete empty stranica docs (o-nama, klub).
// Run: SANITY_TOKEN=sk... node scripts/migration/seed-klub-prica.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = process.env.SANITY_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();
const API = 'https://jxoy4fyb.api.sanity.io/v2024-01-01/data/mutate/production';
const FOUNDING_IMG = 'image-374cc89691a58f649218467c745c437d1510d6d6-1200x611-webp';

let k = 0;
const key = () => `k${++k}`;
const block = (text) => ({
  _type: 'block', _key: key(), style: 'normal', markDefs: [],
  children: [{ _type: 'span', _key: key(), text, marks: [] }],
});

const item = (godina, labela, naslovHr, naslovDe, tekstHr, tekstDe, slika) => ({
  _type: 'stavka', _key: key(), godina,
  ...(labela ? { godinaLabela: { _type: 'localeString', hr: labela.hr, de: labela.de } } : {}),
  naslov: { _type: 'localeString', hr: naslovHr, de: naslovDe },
  tekst: { _type: 'localeText', hr: tekstHr, de: tekstDe },
  ...(slika ? { slika: { _type: 'image', asset: { _type: 'reference', _ref: slika } } } : {}),
});

const doc = {
  _id: 'klubStranica',
  _type: 'klubStranica',
  uvod: {
    _type: 'localeBlockContent',
    hr: [block('Dobrodošli! Ovdje ćete upoznati naš klub i njegovu bogatu povijest — od osnutka 1995. godine, preko uspona i padova, do kluba kakav je danas. Ovo su ključni trenuci naše priče.')],
    de: [block('Willkommen! Hier erzählen wir die Geschichte unseres Vereins — von der Gründung im Jahr 1995 über Höhen und Tiefen bis heute. Das sind die wichtigsten Stationen unseres Weges.')],
  },
  timeline: [
    item(1995, null,
      'Osnivanje kluba', 'Gründung des Vereins',
      'Klub je osnovan 1995. godine pod imenom HNK Mladost Schwyz, sa sjedištem u Schwyzu. Prva momčad natjecala se u petoj regionalnoj ligi Innerschweiz.',
      'Der Verein wurde 1995 unter dem Namen HNK Mladost Schwyz mit Sitz in Schwyz gegründet. Die erste Mannschaft spielte in der fünften Regionalliga der Innerschweiz.',
      FOUNDING_IMG),
    item(1996, null,
      'Uspon u četvrtu ligu', 'Aufstieg in die vierte Liga',
      'Već sljedeće godine momčad je izborila promociju u četvrtu ligu — prvi veliki iskorak mladog kluba.',
      'Bereits im folgenden Jahr schaffte die Mannschaft den Aufstieg in die vierte Liga — der erste grosse Schritt des jungen Vereins.'),
    item(1998, { hr: 'Kasne 1990-e', de: 'Späte 1990er' },
      'Najveći sportski uspjeh', 'Grösster sportlicher Erfolg',
      'Nakon nekoliko uspješnih sezona klub je ostvario najveći uspjeh u svojoj povijesti: plasman u kvalifikacijske utakmice za ulazak u treću ligu.',
      'Nach mehreren erfolgreichen Saisons erreichte der Verein den grössten Erfolg seiner Geschichte: die Qualifikationsspiele für den Aufstieg in die dritte Liga.'),
    item(2003, { hr: '2000-e', de: '2000er' },
      'Smjena generacija', 'Generationenwechsel',
      'Uslijedile su teške godine. Mlađi članovi preuzeli su klub nastojeći očuvati njegovu vitalnost, no odlasci igrača u druge klubove doveli su do raspada momčadi i povlačenja iz natjecanja. Klub je ostao tek na papiru — bez aktivne momčadi i uprave.',
      'Es folgten schwierige Jahre. Jüngere Mitglieder übernahmen den Verein und bemühten sich, ihn am Leben zu erhalten — doch die Abgänge mehrerer Spieler zu anderen Klubs führten zur Auflösung der Mannschaft und zum Rückzug aus dem Spielbetrieb. Der Verein bestand nur noch auf dem Papier, ohne aktive Mannschaft und ohne Vorstand.'),
    item(2009, null,
      'Novi početak', 'Der Neuanfang',
      'Na Generalnoj skupštini donesena je odluka o promjeni imena u HNK Kroatien Schwyz i izboru nove uprave, s ciljem da se klub podigne iz pepela i osigura njegov opstanak. Ta se odluka pokazala ključnim korakom prema obnovi kluba.',
      'An der Generalversammlung wurde beschlossen, den Verein in HNK Kroatien Schwyz umzubenennen und einen neuen Vorstand zu wählen — mit dem Ziel, den Verein aus der Asche zu heben und seinen Fortbestand zu sichern. Dieser Entscheid erwies sich als Schlüsselschritt zur Erneuerung des Vereins.'),
    item(2026, { hr: 'Danas', de: 'Heute' },
      'Klub s vizijom', 'Ein Verein mit Vision',
      'HNK Kroatien Schwyz danas vodi nova, energična uprava koju čine mladi ljudi s vizijom. Naša misija ostaje ista: čuvati nogometnu tradiciju, promicati zdrav sportski duh i povezivati hrvatsku zajednicu u Schwyzu i okolici. Klub danas okuplja više momčadi — od najmlađih juniora do seniora — i nastavlja rasti iz godine u godinu.',
      'HNK Kroatien Schwyz wird heute von einem neuen, energiegeladenen Vorstand geführt — jungen Menschen mit Vision. Unsere Mission bleibt dieselbe: die Fussballtradition zu pflegen, einen gesunden Sportsgeist zu fördern und die kroatische Gemeinschaft in Schwyz und Umgebung zu verbinden. Heute zählt der Verein mehrere Mannschaften — von den jüngsten Junioren bis zu den Senioren — und wächst von Jahr zu Jahr weiter.'),
  ],
};

const res = await fetch(API, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    mutations: [
      { createOrReplace: doc },
      { delete: { id: 'stranica-o-nama' } },
      { delete: { id: 'stranica-klub' } },
    ],
  }),
});
console.log(res.status, JSON.stringify(await res.json()).slice(0, 300));
