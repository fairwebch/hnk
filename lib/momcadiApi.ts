import type { LocaleString, Pozicija, RedImena } from '@/sanity/lib/types';
import type { CmsImg } from '@/lib/cmsImage';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): momčadi se ovdje čitaju
 * sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja — isti
 * obrazac kao lib/sponsorsApi.ts, lib/clanUpraveApi.ts i lib/stranicaApi.ts
 * (Moduli 1-3), vidi hostpoint-cms/README.md. Svi ostali tipovi sadržaja i
 * dalje idu preko Sanityja; ova grana ne dira ništa drugo.
 *
 * Dva oblika kao i u Sanityju: lista (allMomcadiQuery ekvivalent — bez
 * rostera, samo brojIgraca) i puni tim po slug-u (momcadBySlugQuery
 * ekvivalent — igraci[], trener, gallery[], description kao HTML iz
 * Markdowna, kao kod stranica). Frontend zadržava istu rosterMode
 * (igraci.length > 0) logiku — legacy popisImena je i dalje tu kao fallback.
 *
 * MOMCADI_API_BASE_URL override postoji samo za lokalno testiranje protiv
 * `php -S 127.0.0.1:8098 -t hostpoint-cms/public`.
 */
const MOMCADI_API_BASE_URL =
  process.env.MOMCADI_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

type ApiLocale = { hr: string | null; de: string | null } | null;

interface MomcadApiSummary {
  id: number;
  slug: string;
  name: { hr: string; de: string | null };
  order: number;
  liga: ApiLocale;
  coverImage: CmsImg | null;
  grupnaFotografija: CmsImg | null;
  popisImena: { id: number; oznakaReda: ApiLocale; imena: string }[];
  brojIgraca: number;
}

interface MomcadApiFull extends MomcadApiSummary {
  terminTreninga: ApiLocale;
  description: { hr: string | null; de: string | null };
  igraci: {
    id: number;
    ime: string;
    prezime: string | null;
    broj: number | null;
    pozicija: Pozicija | null;
    slika: CmsImg | null;
  }[];
  trener: { ime: string; funkcija: ApiLocale; slika: CmsImg | null } | null;
  gallery: (CmsImg & { id: number; alt: string | null })[];
}

/** Igrač iz PHP API-ja — isti oblik kao Sanity `Igrac`, samo je slika CmsImg umjesto Sanity asseta. */
export interface IgracFromApi {
  _key: string;
  ime: string;
  prezime?: string;
  broj?: number;
  pozicija?: Pozicija;
  slika?: CmsImg;
}

/** Momčad iz PHP API-ja, oblikovana što bliže postojećem Sanity `Momcad` tipu. */
export interface MomcadFromApi {
  _id: string;
  slug: string;
  name: LocaleString;
  order: number;
  liga?: LocaleString;
  coverImage?: CmsImg;
  grupnaFotografija?: CmsImg;
  popisImena?: RedImena[];
  /** Broj strukturiranih igrača (lista i detalj). */
  brojIgraca: number;
  // Samo na detalju:
  terminTreninga?: LocaleString;
  /** Markdown već renderiran u HTML na PHP strani (kao stranice) — ne Portable Text. */
  descriptionHtml?: LocaleString;
  igraci?: IgracFromApi[];
  trener?: { ime?: string; funkcija?: LocaleString; slika?: CmsImg };
  gallery?: CmsImg[];
}

function loc(v: ApiLocale): LocaleString | undefined {
  return v ? { hr: v.hr ?? undefined, de: v.de ?? undefined } : undefined;
}

function mapSummary(item: MomcadApiSummary): MomcadFromApi {
  return {
    _id: String(item.id),
    slug: item.slug,
    name: { hr: item.name.hr, de: item.name.de ?? undefined },
    order: item.order,
    liga: loc(item.liga),
    coverImage: item.coverImage ?? undefined,
    grupnaFotografija: item.grupnaFotografija ?? undefined,
    popisImena: item.popisImena.map((r) => ({
      _key: String(r.id),
      oznakaReda: loc(r.oznakaReda),
      imena: r.imena,
    })),
    brojIgraca: item.brojIgraca,
  };
}

function mapFull(item: MomcadApiFull): MomcadFromApi {
  return {
    ...mapSummary(item),
    terminTreninga: loc(item.terminTreninga),
    descriptionHtml: {
      hr: item.description.hr ?? undefined,
      de: item.description.de ?? undefined,
    },
    igraci: item.igraci.map((p) => ({
      _key: String(p.id),
      ime: p.ime,
      prezime: p.prezime ?? undefined,
      broj: p.broj ?? undefined,
      pozicija: p.pozicija ?? undefined,
      slika: p.slika ?? undefined,
    })),
    trener: item.trener
      ? {
          ime: item.trener.ime,
          funkcija: loc(item.trener.funkcija),
          slika: item.trener.slika ?? undefined,
        }
      : undefined,
    gallery: item.gallery,
  };
}

/** Sve objavljene momčadi, sortirane po redoslijedu (isto ponašanje kao allMomcadiQuery). */
export async function fetchMomcadi(): Promise<MomcadFromApi[]> {
  try {
    const res = await fetch(`${MOMCADI_API_BASE_URL}/api/momcadi.php`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error('[momcadiApi] non-OK response:', res.status);
      return [];
    }
    const data: { teams: MomcadApiSummary[] } = await res.json();
    return data.teams.map(mapSummary);
  } catch (e) {
    console.error('[momcadiApi] fetch failed:', e);
    return [];
  }
}

/** Jedna objavljena momčad po slug-u, ili null (isto ponašanje kao momcadBySlugQuery). */
export async function fetchMomcad(slug: string): Promise<MomcadFromApi | null> {
  try {
    const res = await fetch(
      `${MOMCADI_API_BASE_URL}/api/momcadi.php?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      console.error('[momcadiApi] non-OK response:', res.status);
      return null;
    }
    const data: MomcadApiFull = await res.json();
    return mapFull(data);
  } catch (e) {
    console.error('[momcadiApi] fetch failed:', e);
    return null;
  }
}
