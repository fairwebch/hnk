import type { Sponzor } from '@/sanity/lib/types';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): sponzori se ovdje čitaju
 * sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja — vidi
 * hostpoint-cms/README.md u ovom repou za pozadinu. Svi ostali tipovi
 * sadržaja i dalje idu preko Sanityja; ova grana ne dira ništa drugo.
 *
 * SPONSORS_API_BASE_URL override postoji samo za lokalno testiranje protiv
 * `php -S 127.0.0.1:8098 -t hostpoint-cms/public` (vidi README) — u
 * produkciji/stagingu bez override-a ide na pravu poddomenu.
 */
const SPONSORS_API_BASE_URL =
  process.env.SPONSORS_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

interface SponsorApiLogo {
  small: string;
  medium: string;
  large: string;
  isVector: boolean;
  width: number | null;
  height: number | null;
}

interface SponsorApiItem {
  id: number;
  name: string;
  logo: SponsorApiLogo | null;
  package: 'Basic' | 'Standard' | 'Premium';
  link: string | null;
  packageDescription: { hr: string | null; de: string | null };
  order: number;
}

/** Sponzor iz PHP API-ja, oblikovan što bliže postojećem Sanity `Sponzor` tipu. */
export type SponzorFromApi = Omit<Sponzor, 'logo' | 'packageDescription'> & {
  logo?: SponsorApiLogo;
  packageDescription?: { hr?: string; de?: string };
};

function mapItem(item: SponsorApiItem): SponzorFromApi {
  return {
    _id: String(item.id),
    name: item.name,
    logo: item.logo ?? undefined,
    package: item.package,
    link: item.link ?? undefined,
    packageDescription: {
      hr: item.packageDescription.hr ?? undefined,
      de: item.packageDescription.de ?? undefined,
    },
  };
}

/** Lista objavljenih sponzora, sortirana po redoslijedu (isto ponašanje kao sponzoriQuery). */
export async function fetchSponsors(): Promise<SponzorFromApi[]> {
  try {
    const url = `${SPONSORS_API_BASE_URL}/api/sponzori.php`;
    // TEMP diagnostic for the staging pattern-test — this fetch runs
    // server-side (SSR), so it never shows up in the browser Network tab;
    // this log is how we prove the request target without it. Fine to
    // drop once the migration is verified.
    console.log('[sponsorsApi] fetching', url);
    const res = await fetch(url, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error('[sponsorsApi] non-OK response:', res.status);
      return [];
    }
    const data: { sponsors: SponsorApiItem[] } = await res.json();
    return data.sponsors.map(mapItem);
  } catch (e) {
    console.error('[sponsorsApi] fetch failed:', e);
    return [];
  }
}
