import type { Dogadjaj, LocaleString } from '@/lib/cmsTypes';
import type { CmsImg } from '@/lib/cmsImage';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): JAVNI dio događaja se ovdje
 * čita sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja —
 * isti obrazac kao lib/novostiApi.ts (Moduli 1-6), vidi hostpoint-cms/README.md.
 *
 * Privatne prijave (osobni podaci) NISU dio ovog API-ja: žive u zasebnoj bazi
 * s vlastitim MySQL korisnikom i idu kroz zaseban prijavni endpoint. Ovaj
 * javni endpoint nikad ne vraća `tajniKod` ni brojeve prijava.
 *
 * "Nadolazeći/prošli" računa PHP u UTC nad COALESCE(datumKraj, datumPocetak),
 * kao GROQ now() ranije; countdown na sajtu ostaje klijentski.
 */
const DOGADJAJI_API_BASE_URL =
  process.env.DOGADJAJI_API_BASE_URL || 'https://api.kroatien-schwyz.ch';

type ApiLocale = { hr: string | null; de: string | null } | null;

interface DogadjajApiItem {
  id: number;
  slug: string;
  name: { hr: string; de: string | null };
  kategorija: Dogadjaj['kategorija'] | null;
  datumPocetak: string;
  prikaziPocetak: boolean;
  datumKraj: string | null;
  prikaziKraj: boolean;
  location: string | null;
  prikaziLokaciju: boolean;
  coverImage: CmsImg | null;
  flyerImage: CmsImg | null;
  description: { hr: string | null; de: string | null };
  kotizacija: string | null;
  prikaziKotizaciju: boolean;
  prijavaLink: string | null;
  prikaziGumbPrijave: boolean;
  prikaziInfoKarticu: boolean;
  kapacitet: string | null;
  prikaziKapacitet: boolean;
  program: { vrijeme: string | null; opis: string | null }[];
  vrstaPrijave: 'bez' | 'osoba' | 'ekipa';
  pristupPrijavi: 'javna' | 'clanovi';
  prijaveOtvorene: boolean;
  rokPrijave: string | null;
  sponsors: { name: string; logo: CmsImg | null; link: string | null }[];
  galerija: { name: ApiLocale; slug: string } | null;
}

/** Događaj iz PHP API-ja, oblikovan što bliže Sanity `Dogadjaj` tipu (cover/logo su CmsImg, opis je HTML). */
export type DogadjajFromApi = Omit<Dogadjaj, 'coverImage' | 'flyerImage' | 'description' | 'sponsors'> & {
  coverImage?: CmsImg;
  flyerImage?: CmsImg;
  /** Markdown već renderiran u HTML na PHP strani. */
  descriptionHtml?: LocaleString;
  sponsors?: { name?: string; logo?: CmsImg; link?: string }[];
};

function loc(v: ApiLocale): LocaleString | undefined {
  return v ? { hr: v.hr ?? undefined, de: v.de ?? undefined } : undefined;
}

function mapItem(d: DogadjajApiItem): DogadjajFromApi {
  return {
    _id: String(d.id),
    slug: d.slug,
    name: { hr: d.name.hr, de: d.name.de ?? undefined },
    kategorija: d.kategorija ?? undefined,
    datumPocetak: d.datumPocetak,
    prikaziPocetak: d.prikaziPocetak,
    datumKraj: d.datumKraj ?? undefined,
    prikaziKraj: d.prikaziKraj,
    location: d.location ?? undefined,
    prikaziLokaciju: d.prikaziLokaciju,
    coverImage: d.coverImage ?? undefined,
    flyerImage: d.flyerImage ?? undefined,
    descriptionHtml: { hr: d.description.hr ?? undefined, de: d.description.de ?? undefined },
    kotizacija: d.kotizacija ?? undefined,
    prikaziKotizaciju: d.prikaziKotizaciju,
    prijavaLink: d.prijavaLink ?? undefined,
    prikaziGumbPrijave: d.prikaziGumbPrijave,
    prikaziInfoKarticu: d.prikaziInfoKarticu,
    kapacitet: d.kapacitet ?? undefined,
    prikaziKapacitet: d.prikaziKapacitet,
    program: d.program.map((p, i) => ({ _key: String(i), vrijeme: p.vrijeme ?? undefined, opis: p.opis ?? undefined })),
    vrstaPrijave: d.vrstaPrijave,
    pristupPrijavi: d.pristupPrijavi,
    prijaveOtvorene: d.prijaveOtvorene,
    rokPrijave: d.rokPrijave ?? undefined,
    // ?? [] — most polje ako je PHP API još stara verzija (deploy race: frontend prije backend-a).
    sponsors: (d.sponsors ?? []).map((s) => ({ name: s.name, logo: s.logo ?? undefined, link: s.link ?? undefined })),
    galerija: d.galerija ? { name: loc(d.galerija.name), slug: d.galerija.slug } : null,
  };
}

async function get<T>(query: string, label: string, fallback: T): Promise<T | { raw: unknown }> {
  try {
    const res = await fetch(`${DOGADJAJI_API_BASE_URL}/api/dogadjaji.php${query}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return fallback;
    if (!res.ok) {
      console.error(`[dogadjajiApi] ${label} non-OK response:`, res.status);
      return fallback;
    }
    return { raw: await res.json() };
  } catch (e) {
    console.error(`[dogadjajiApi] ${label} fetch failed:`, e);
    return fallback;
  }
}

/** Nadolazeći (datumPocetak ASC) i prošli (DESC) — kao upcomingDogadjajiQuery + pastDogadjajiQuery. */
export async function fetchDogadjaji(): Promise<{ upcoming: DogadjajFromApi[]; past: DogadjajFromApi[] }> {
  const r = await get('', 'list', null);
  if (!r || !('raw' in r)) return { upcoming: [], past: [] };
  const data = r.raw as { upcoming: DogadjajApiItem[]; past: DogadjajApiItem[] };
  return { upcoming: data.upcoming.map(mapItem), past: data.past.map(mapItem) };
}

/** Prvi nadolazeći ili null — kao nextDogadjajQuery (početna). */
export async function fetchNextDogadjaj(): Promise<DogadjajFromApi | null> {
  const r = await get('?next=1', 'next', null);
  if (!r || !('raw' in r) || !r.raw) return null;
  return mapItem(r.raw as DogadjajApiItem);
}

/** Jedan objavljen događaj po slug-u, ili null — kao dogadjajBySlugQuery. */
export async function fetchDogadjaj(slug: string): Promise<DogadjajFromApi | null> {
  const r = await get(`?slug=${encodeURIComponent(slug)}`, 'detail', null);
  if (!r || !('raw' in r)) return null;
  return mapItem(r.raw as DogadjajApiItem);
}
