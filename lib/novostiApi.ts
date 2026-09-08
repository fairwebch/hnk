import type { LocaleString } from '@/lib/cmsTypes';
import type { CmsImg } from '@/lib/cmsImage';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): novosti se ovdje čitaju sa
 * self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja — isti
 * obrazac kao lib/galerijeApi.ts (Moduli 1-5), vidi hostpoint-cms/README.md.
 *
 * Lista i teaser dolaze BEZ body-ja (NewsList/NewsHighlights ga ne koriste —
 * Sanity projekcija ga je slala nepotrebno); paginacija liste ostaje
 * klijentska u components/NewsList.tsx (9 po stranici), netaknuta. Detalj
 * nosi body kao HTML (Markdown -> HTML na PHP strani), prikaz preko
 * components/ui/HtmlContent.tsx kao kod stranica.
 *
 * NOVOSTI_API_BASE_URL override postoji samo za lokalno testiranje protiv
 * `php -S 127.0.0.1:8098 -t hostpoint-cms/public`.
 */
const NOVOSTI_API_BASE_URL =
  process.env.NOVOSTI_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

type ApiLocale = { hr: string | null; de: string | null } | null;

interface NovostApiSummary {
  id: number;
  slug: string;
  title: { hr: string; de: string | null };
  date: string;
  category: string;
  coverImage: CmsImg | null;
  excerpt: ApiLocale;
}

interface NovostApiFull extends NovostApiSummary {
  body: { hr: string | null; de: string | null };
  images: (CmsImg & { id: number })[];
}

/** Novost iz PHP API-ja — isti oblik kao Sanity `Novost`, samo je cover CmsImg, a body HTML string. */
export interface NovostFromApi {
  _id: string;
  title: LocaleString;
  slug: string;
  date: string;
  category?: string;
  coverImage?: CmsImg;
  excerpt?: LocaleString;
  /** Samo na detalju. Markdown već renderiran u HTML na PHP strani. */
  bodyHtml?: LocaleString;
}

function loc(v: ApiLocale): LocaleString | undefined {
  return v ? { hr: v.hr ?? undefined, de: v.de ?? undefined } : undefined;
}

function mapSummary(item: NovostApiSummary): NovostFromApi {
  return {
    _id: String(item.id),
    slug: item.slug,
    title: { hr: item.title.hr, de: item.title.de ?? undefined },
    date: item.date,
    category: item.category || undefined,
    coverImage: item.coverImage ?? undefined,
    excerpt: loc(item.excerpt),
  };
}

async function fetchList(query: string, label: string): Promise<NovostFromApi[]> {
  try {
    const res = await fetch(`${NOVOSTI_API_BASE_URL}/api/novosti.php${query}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error(`[novostiApi] ${label} non-OK response:`, res.status);
      return [];
    }
    const data: { news: NovostApiSummary[] } = await res.json();
    return data.news.map(mapSummary);
  } catch (e) {
    console.error(`[novostiApi] ${label} fetch failed:`, e);
    return [];
  }
}

/** Sve objavljene novosti, datum DESC, bez body-ja (kao allNovostiQuery). */
export function fetchNovosti(): Promise<NovostFromApi[]> {
  return fetchList('', 'list');
}

/** Najnovije novosti za početnu (kao latestNovostiQuery). */
export function fetchLatestNovosti(limit: number): Promise<NovostFromApi[]> {
  return fetchList(`?limit=${limit}`, 'latest');
}

/** Jedna objavljena novost s body-jem, ili null (kao novostBySlugQuery). */
export async function fetchNovost(slug: string): Promise<NovostFromApi | null> {
  try {
    const res = await fetch(
      `${NOVOSTI_API_BASE_URL}/api/novosti.php?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      console.error('[novostiApi] detail non-OK response:', res.status);
      return null;
    }
    const data: NovostApiFull = await res.json();
    return {
      ...mapSummary(data),
      bodyHtml: { hr: data.body.hr ?? undefined, de: data.body.de ?? undefined },
    };
  } catch (e) {
    console.error('[novostiApi] detail fetch failed:', e);
    return null;
  }
}
