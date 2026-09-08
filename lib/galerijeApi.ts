import type { LocaleString } from '@/lib/cmsTypes';
import type { CmsImg } from '@/lib/cmsImage';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): galerije se ovdje čitaju
 * sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja — isti
 * obrazac kao lib/momcadiApi.ts (Moduli 1-4), vidi hostpoint-cms/README.md.
 *
 * Tri oblika kao i u Sanityju: sva lista (allGalerijeQuery: cover + count,
 * bez paginacije — kao danas), teaser za početnu (galerijeTeaserQuery,
 * ?limit=N po datumu) i puna galerija po slug-u (galerijaBySlugQuery: sve
 * slike). Slike nose `thumb` (600x600 crop) za grid — isto što je Sanity CDN
 * davao kao 600x600 fit=crop, pa je težina stranice jednaka produkciji i za
 * najveći album (408 slika).
 *
 * GALERIJE_API_BASE_URL override postoji samo za lokalno testiranje protiv
 * `php -S 127.0.0.1:8098 -t hostpoint-cms/public`.
 */
const GALERIJE_API_BASE_URL =
  process.env.GALERIJE_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

type ApiLocale = { hr: string | null; de: string | null } | null;

interface GalerijaApiBase {
  id: number;
  slug: string;
  name: { hr: string; de: string | null };
  kategorija: 'sport' | 'feste';
  godina: number;
  date: string | null;
}

interface GalerijaApiTeaser extends GalerijaApiBase {
  cover: CmsImg | null;
  count: number;
}

interface GalerijaApiFull extends GalerijaApiBase {
  description: ApiLocale;
  count: number;
  images: (CmsImg & { id: number })[];
}

/** Lagani oblik za listu/početnu — isti oblik kao Sanity `GalerijaTeaser`, samo je cover CmsImg. */
export interface GalerijaTeaserFromApi {
  _id: string;
  name: LocaleString;
  slug: string;
  kategorija?: 'sport' | 'feste';
  godina?: number;
  date?: string;
  cover?: CmsImg;
  count?: number;
}

/** Puna galerija — isti oblik kao Sanity `Galerija`, samo su slike CmsImg[]. */
export interface GalerijaFromApi {
  _id: string;
  name: LocaleString;
  slug: string;
  kategorija?: 'sport' | 'feste';
  godina?: number;
  date?: string;
  description?: LocaleString;
  images: CmsImg[];
}

function base(item: GalerijaApiBase) {
  return {
    _id: String(item.id),
    slug: item.slug,
    name: { hr: item.name.hr, de: item.name.de ?? undefined },
    kategorija: item.kategorija,
    godina: item.godina,
    date: item.date ?? undefined,
  };
}

function mapTeaser(item: GalerijaApiTeaser): GalerijaTeaserFromApi {
  return { ...base(item), cover: item.cover ?? undefined, count: item.count };
}

function mapFull(item: GalerijaApiFull): GalerijaFromApi {
  return {
    ...base(item),
    description: item.description
      ? { hr: item.description.hr ?? undefined, de: item.description.de ?? undefined }
      : undefined,
    images: item.images,
  };
}

async function fetchTeasers(query: string, label: string): Promise<GalerijaTeaserFromApi[]> {
  try {
    const res = await fetch(`${GALERIJE_API_BASE_URL}/api/galerije.php${query}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error(`[galerijeApi] ${label} non-OK response:`, res.status);
      return [];
    }
    const data: { galleries: GalerijaApiTeaser[] } = await res.json();
    return data.galleries.map(mapTeaser);
  } catch (e) {
    console.error(`[galerijeApi] ${label} fetch failed:`, e);
    return [];
  }
}

/** Sve objavljene galerije, godina DESC pa datum DESC (isto kao allGalerijeQuery). */
export function fetchGalerije(): Promise<GalerijaTeaserFromApi[]> {
  return fetchTeasers('', 'list');
}

/** Najnovije galerije po datumu za početnu (isto kao galerijeTeaserQuery). */
export function fetchGalerijeTeaser(limit: number): Promise<GalerijaTeaserFromApi[]> {
  return fetchTeasers(`?limit=${limit}`, 'teaser');
}

/** Jedna objavljena galerija sa svim slikama, ili null (isto kao galerijaBySlugQuery). */
export async function fetchGalerija(slug: string): Promise<GalerijaFromApi | null> {
  try {
    const res = await fetch(
      `${GALERIJE_API_BASE_URL}/api/galerije.php?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      console.error('[galerijeApi] detail non-OK response:', res.status);
      return null;
    }
    const data: GalerijaApiFull = await res.json();
    return mapFull(data);
  } catch (e) {
    console.error('[galerijeApi] detail fetch failed:', e);
    return null;
  }
}
