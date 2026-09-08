import type { CmsImg } from '@/lib/cmsImage';

/**
 * Postavke sajta (fotografije) s PHP CMS-a — zamjena za Sanity
 * postavkeSajtaQuery/pageHeaderSlikeQuery (Modul 8). Hero: 1 slika =
 * statično, 2–3 = crossfade (HeroBackdrop); headeri: pozadina PageHero na
 * /klub, /sponzoring, /postani-clan. Prazan objekt pri grešci = isti
 * fallback kao prije (tamni hero/header bez fotografije).
 */
const SAJT_API_BASE_URL =
  process.env.SAJT_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

export interface SajtSlike {
  heroSlike: CmsImg[];
  headerKlub?: CmsImg | null;
  headerSponzoring?: CmsImg | null;
  headerPostaniClan?: CmsImg | null;
}

const EMPTY: SajtSlike = { heroSlike: [] };

export async function fetchSajtSlike(): Promise<SajtSlike> {
  try {
    const res = await fetch(`${SAJT_API_BASE_URL}/api/sajt.php`, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error('[sajtApi] non-OK response:', res.status);
      return EMPTY;
    }
    const data: SajtSlike = await res.json();
    return { ...EMPTY, ...data, heroSlike: data.heroSlike ?? [] };
  } catch (e) {
    console.error('[sajtApi] fetch failed:', e);
    return EMPTY;
  }
}
