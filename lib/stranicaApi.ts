/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): "stranica" dokumenti se
 * ovdje čitaju sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz
 * Sanityja — isti obrazac kao lib/sponsorsApi.ts i lib/clanUpraveApi.ts
 * (Modul 1/2), vidi hostpoint-cms/README.md. Svi ostali tipovi sadržaja i
 * dalje idu preko Sanityja; ova grana ne dira ništa drugo.
 *
 * Za razliku od sponzori/clanUprave, `body` ovdje NIJE Portable Text —
 * PHP strana konvertuje Markdown izvor u HTML PRIJE slanja (vidi
 * hostpoint-cms/public/admin/includes/markdown.php), pa se prikazuje preko
 * components/ui/HtmlContent.tsx (dangerouslySetInnerHTML), ne preko
 * @portabletext/react. `sanity/lib/types.ts`'s `Stranica` tip se namjerno
 * NE reupotrebljava za `body`/`intro` (oblik polja se fundamentalno mijenja
 * iz blok-niza u HTML string) — samo `title`/`slug` oblik ostaje isti.
 *
 * STRANICA_API_BASE_URL override postoji samo za lokalno testiranje protiv
 * `php -S 127.0.0.1:8098 -t hostpoint-cms/public` — u produkciji/stagingu
 * bez override-a ide na pravu poddomenu.
 */
const STRANICA_API_BASE_URL =
  process.env.STRANICA_API_BASE_URL || 'https://api.kroatien-schwyz.ch';

interface StranicaApiItem {
  id: number;
  slug: string;
  title: { hr: string; de: string | null };
  intro: { hr: string | null; de: string | null } | null;
  body: { hr: string | null; de: string | null };
}

export interface StranicaFromApi {
  _id: string;
  slug: string;
  title: { hr?: string; de?: string };
  intro?: { hr?: string; de?: string };
  bodyHtml: { hr?: string; de?: string };
}

function mapItem(item: StranicaApiItem): StranicaFromApi {
  return {
    _id: String(item.id),
    slug: item.slug,
    title: { hr: item.title.hr ?? undefined, de: item.title.de ?? undefined },
    intro: item.intro
      ? { hr: item.intro.hr ?? undefined, de: item.intro.de ?? undefined }
      : undefined,
    bodyHtml: { hr: item.body.hr ?? undefined, de: item.body.de ?? undefined },
  };
}

/** Jedna objavljena stranica po slug-u, ili null ako ne postoji/nije objavljena (isto ponašanje kao stranicaBySlugQuery). */
export async function fetchStranica(slug: string): Promise<StranicaFromApi | null> {
  try {
    const res = await fetch(
      `${STRANICA_API_BASE_URL}/api/stranica.php?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      console.error('[stranicaApi] non-OK response:', res.status);
      return null;
    }
    const data: StranicaApiItem = await res.json();
    return mapItem(data);
  } catch (e) {
    console.error('[stranicaApi] fetch failed:', e);
    return null;
  }
}
