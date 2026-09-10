import type { CmsImg } from '@/lib/cmsImage';

/**
 * Zajednički tipovi sadržaja (bivši sanity/lib/types.ts, bez ovisnosti o
 * `sanity` paketu). Slike su CmsImg s PHP API-ja; bogati tekst stiže kao
 * HTML string (Markdown renderiran na serveru), pa `LocaleBlocks` ostaje samo
 * kao "polje koje moduli Omit-aju" — vidi lib/*Api.ts.
 */
export type Locale = 'hr' | 'de';
export type LocaleString = { hr?: string; de?: string };
export type LocaleText = { hr?: string; de?: string };
export type LocaleBlocks = { hr?: unknown[]; de?: unknown[] };

export interface ClanUprave {
  _id: string;
  name: string;
  role: LocaleString;
  zaduzenje?: LocaleString;
  phone?: string;
  image?: CmsImg;
  order: number;
}

export type Pozicija = 'golman' | 'obrana' | 'vezni' | 'napad';

export interface RedImena {
  _key?: string;
  oznakaReda?: LocaleString;
  imena?: string;
}

export interface Sponzor {
  _id: string;
  name: string;
  logo?: CmsImg;
  package: 'Basic' | 'Standard' | 'Premium';
  link?: string;
  packageDescription?: LocaleText;
}

export interface ProgramStavka {
  _key?: string;
  vrijeme?: string;
  opis?: string;
}

export interface Dogadjaj {
  _id: string;
  name: LocaleString;
  slug: string;
  kategorija?: 'Turnir' | 'Zabava' | 'Izlet' | 'Skupština';
  datumPocetak: string;
  prikaziPocetak?: boolean;
  datumKraj?: string;
  prikaziKraj?: boolean;
  location?: string;
  prikaziLokaciju?: boolean;
  coverImage?: CmsImg;
  /** Zasebna kvadratna (1:1) promo slika za društvene mreže/newsletter, odvojeno od coverImage. */
  flyerImage?: CmsImg;
  description?: LocaleBlocks;
  kotizacija?: string;
  prikaziKotizaciju?: boolean;
  prijavaLink?: string;
  prikaziGumbPrijave?: boolean;
  prikaziInfoKarticu?: boolean;
  kapacitet?: string;
  prikaziKapacitet?: boolean;
  vrstaPrijave?: 'bez' | 'osoba' | 'ekipa';
  pristupPrijavi?: 'javna' | 'clanovi';
  prijaveOtvorene?: boolean;
  rokPrijave?: string;
  program?: ProgramStavka[];
  /** Opći sponzori (M:N) + event-only sponzori, već spojeni i sortirani po redoslijedu. */
  sponsors?: { name?: string; logo?: CmsImg; link?: string }[];
  galerija?: { name?: LocaleString; slug?: string } | null;
}
