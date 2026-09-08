import type { CmsImg } from '@/lib/cmsImage';
import type { LocaleString } from '@/lib/cmsTypes';

/**
 * "Klub — naša priča" (/klub) s PHP CMS-a — zamjena za Sanity
 * klubStranicaQuery (Modul 8). Uvod/završni tekst stižu kao HTML (Markdown
 * renderiran na serveru, prikaz preko HtmlContent), timeline tekst je običan
 * tekst s novim redovima (whitespace-pre-line kao prije).
 */
const KLUB_API_BASE_URL =
  process.env.KLUB_API_BASE_URL || 'https://api.kroatien-schwyz.ch';

interface ApiLocale {
  hr: string | null;
  de: string | null;
}

interface KlubApiResponse {
  uvod: ApiLocale | null;
  zavrsni: ApiLocale | null;
  timeline: {
    id: number;
    godina: number;
    godinaLabela: ApiLocale | null;
    naslov: ApiLocale | null;
    tekst: ApiLocale | null;
    slika: CmsImg | null;
  }[];
}

export interface TimelineStavkaFromApi {
  _key: string;
  godina: number;
  godinaLabela?: LocaleString;
  naslov: LocaleString;
  tekst: LocaleString;
  slika?: CmsImg;
}

export interface KlubStranicaFromApi {
  uvodHtml?: LocaleString;
  zavrsniHtml?: LocaleString;
  timeline: TimelineStavkaFromApi[];
}

function loc(v: ApiLocale | null): LocaleString | undefined {
  return v ? { hr: v.hr ?? undefined, de: v.de ?? undefined } : undefined;
}

export async function fetchKlubStranica(): Promise<KlubStranicaFromApi | null> {
  try {
    const res = await fetch(`${KLUB_API_BASE_URL}/api/klub.php`, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error('[klubApi] non-OK response:', res.status);
      return null;
    }
    const data: KlubApiResponse = await res.json();
    return {
      uvodHtml: loc(data.uvod),
      zavrsniHtml: loc(data.zavrsni),
      timeline: (data.timeline ?? []).map((t) => ({
        _key: String(t.id),
        godina: t.godina,
        godinaLabela: loc(t.godinaLabela),
        naslov: loc(t.naslov) ?? {},
        tekst: loc(t.tekst) ?? {},
        slika: t.slika ?? undefined,
      })),
    };
  } catch (e) {
    console.error('[klubApi] fetch failed:', e);
    return null;
  }
}
