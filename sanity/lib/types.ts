import type { Image, PortableTextBlock } from 'sanity';

export type Locale = 'hr' | 'de';
export type LocaleString = { hr?: string; de?: string };
export type LocaleText = { hr?: string; de?: string };
export type LocaleBlocks = { hr?: PortableTextBlock[]; de?: PortableTextBlock[] };
export type SanityImg = Image & { alt?: string };

export interface Novost {
  _id: string;
  title: LocaleString;
  slug: string;
  date: string;
  category?: string;
  coverImage?: SanityImg;
  excerpt?: LocaleText;
  body?: LocaleBlocks;
}

export interface ClanUprave {
  _id: string;
  name: string;
  role: LocaleString;
  phone?: string;
  image?: SanityImg;
  order: number;
}

export type Pozicija = 'golman' | 'obrana' | 'vezni' | 'napad';

export interface Igrac {
  _key?: string;
  ime: string;
  prezime?: string;
  broj?: number;
  pozicija?: Pozicija;
  slika?: SanityImg;
}

export interface RedImena {
  _key?: string;
  oznakaReda?: LocaleString;
  imena?: string;
}

export interface Momcad {
  _id: string;
  name: LocaleString;
  slug: string;
  coverImage?: SanityImg;
  description?: LocaleBlocks;
  gallery?: SanityImg[];
  grupnaFotografija?: SanityImg;
  popisImena?: RedImena[];
  igraci?: Igrac[];
  trener?: { ime?: string; funkcija?: LocaleString; slika?: SanityImg };
  liga?: LocaleString;
  terminTreninga?: LocaleString;
  /** Only on the listing query. */
  brojIgraca?: number;
}

export interface Sponzor {
  _id: string;
  name: string;
  logo?: SanityImg;
  package: 'Basic' | 'Standard' | 'Premium';
  link?: string;
  packageDescription?: LocaleText;
}

export interface Galerija {
  _id: string;
  name: LocaleString;
  slug: string;
  kategorija?: 'sport' | 'feste';
  godina?: number;
  date?: string;
  description?: LocaleText;
  images?: SanityImg[];
}

/** Lightweight listing shape for the gallery index (no full image arrays). */
export interface GalerijaTeaser {
  _id: string;
  name: LocaleString;
  slug: string;
  kategorija?: 'sport' | 'feste';
  godina?: number;
  date?: string;
  cover?: SanityImg;
  count?: number;
}

export interface TimelineStavka {
  _key?: string;
  godina: number;
  godinaLabela?: LocaleString;
  naslov: LocaleString;
  tekst: LocaleText;
  slika?: SanityImg;
}

export interface KlubStranica {
  uvod?: { hr?: any[]; de?: any[] };
  timeline?: TimelineStavka[];
  zavrsniTekst?: { hr?: any[]; de?: any[] };
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
  datumKraj?: string;
  location?: string;
  coverImage?: SanityImg;
  description?: LocaleBlocks;
  kotizacija?: string;
  prijavaLink?: string;
  kapacitet?: string;
  vrstaPrijave?: 'bez' | 'osoba' | 'ekipa';
  pristupPrijavi?: 'javna' | 'clanovi';
  prijaveOtvorene?: boolean;
  rokPrijave?: string;
  program?: ProgramStavka[];
  sponzorEventa?: { name?: string; logo?: SanityImg; link?: string } | null;
  galerija?: { name?: LocaleString; slug?: string } | null;
}

export interface Stranica {
  _id: string;
  title: LocaleString;
  slug: string;
  intro?: LocaleText;
  body?: LocaleBlocks;
}
