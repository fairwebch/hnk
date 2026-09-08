import type { ClanUprave } from '@/lib/cmsTypes';

/**
 * TEST MIGRACIJA (staging/php-sponsors-api-test): članovi uprave se ovdje
 * čitaju sa self-hosted PHP+MySQL CMS-a na Hostpointu umjesto iz Sanityja —
 * isti obrazac kao lib/sponsorsApi.ts (Modul 1: sponzori), vidi
 * hostpoint-cms/README.md. Svi ostali tipovi sadržaja i dalje idu preko
 * Sanityja; ova grana ne dira ništa drugo.
 *
 * CLAN_UPRAVE_API_BASE_URL override postoji samo za lokalno testiranje
 * protiv `php -S 127.0.0.1:8098 -t hostpoint-cms/public` — u produkciji/
 * stagingu bez override-a ide na pravu poddomenu.
 */
const CLAN_UPRAVE_API_BASE_URL =
  process.env.CLAN_UPRAVE_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

interface ClanUpraveApiImage {
  small: string;
  medium: string;
  large: string;
  isVector: boolean;
  width: number | null;
  height: number | null;
}

interface ClanUpraveApiItem {
  id: number;
  name: string;
  role: { hr: string | null; de: string | null };
  zaduzenje: { hr: string | null; de: string | null } | null;
  phone: string | null;
  image: ClanUpraveApiImage | null;
  order: number;
}

/** Član uprave iz PHP API-ja, oblikovan što bliže postojećem Sanity `ClanUprave` tipu. */
export type ClanUpraveFromApi = Omit<ClanUprave, 'image'> & {
  image?: ClanUpraveApiImage;
};

function mapItem(item: ClanUpraveApiItem): ClanUpraveFromApi {
  return {
    _id: String(item.id),
    name: item.name,
    role: { hr: item.role.hr ?? undefined, de: item.role.de ?? undefined },
    zaduzenje: item.zaduzenje
      ? { hr: item.zaduzenje.hr ?? undefined, de: item.zaduzenje.de ?? undefined }
      : undefined,
    phone: item.phone ?? undefined,
    image: item.image ?? undefined,
    order: item.order,
  };
}

/** Lista objavljenih članova uprave, sortirana po redoslijedu (isto ponašanje kao upravaQuery). */
export async function fetchClanUprave(): Promise<ClanUpraveFromApi[]> {
  try {
    const res = await fetch(`${CLAN_UPRAVE_API_BASE_URL}/api/clan-uprave.php`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error('[clanUpraveApi] non-OK response:', res.status);
      return [];
    }
    const data: { members: ClanUpraveApiItem[] } = await res.json();
    return data.members.map(mapItem);
  } catch (e) {
    console.error('[clanUpraveApi] fetch failed:', e);
    return [];
  }
}
