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

export interface Momcad {
  _id: string;
  name: LocaleString;
  slug: string;
  coverImage?: SanityImg;
  description?: LocaleBlocks;
  gallery?: SanityImg[];
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
  date?: string;
  description?: LocaleText;
  images?: SanityImg[];
}

export interface Dogadjaj {
  _id: string;
  name: LocaleString;
  slug: string;
  date: string;
  location?: string;
  coverImage?: SanityImg;
  description?: LocaleBlocks;
}

export interface Stranica {
  _id: string;
  title: LocaleString;
  slug: string;
  intro?: LocaleText;
  body?: LocaleBlocks;
}
