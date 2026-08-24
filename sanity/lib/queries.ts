import { groq } from 'next-sanity';

const novostFields = groq`
  _id, title, "slug": slug.current, date, category,
  coverImage, excerpt, body
`;

export const latestNovostiQuery = groq`
  *[_type == "novost"] | order(date desc)[0...$limit]{ ${novostFields} }
`;

export const allNovostiQuery = groq`
  *[_type == "novost"] | order(date desc){ ${novostFields} }
`;

export const novostSlugsQuery = groq`*[_type == "novost" && defined(slug.current)].slug.current`;

export const novostBySlugQuery = groq`
  *[_type == "novost" && slug.current == $slug][0]{ ${novostFields} }
`;

// Events
// NOTE: deliberately no tajniKod here — the member code must never reach the
// public site payload; it is validated server-side in /api/prijava only.
const dogadjajFields = groq`
  _id, name, "slug": slug.current, kategorija, datumPocetak, datumKraj,
  location, coverImage, description, kotizacija, prijavaLink, kapacitet, program,
  vrstaPrijave, pristupPrijavi, prijaveOtvorene, rokPrijave,
  "sponzorEventa": sponzorEventa->{name, logo, link},
  "galerija": galerija->{name, "slug": slug.current}
`;

// "Effective end" = datumKraj ?? datumPocetak decides upcoming vs. past.
export const nextDogadjajQuery = groq`
  *[_type == "dogadjaj" && coalesce(datumKraj, datumPocetak) >= now()] | order(datumPocetak asc)[0]{ ${dogadjajFields} }
`;

export const upcomingDogadjajiQuery = groq`
  *[_type == "dogadjaj" && coalesce(datumKraj, datumPocetak) >= now()] | order(datumPocetak asc){ ${dogadjajFields} }
`;

export const pastDogadjajiQuery = groq`
  *[_type == "dogadjaj" && coalesce(datumKraj, datumPocetak) < now()] | order(datumPocetak desc){ ${dogadjajFields} }
`;

export const dogadjajSlugsQuery = groq`*[_type == "dogadjaj" && defined(slug.current)].slug.current`;

export const dogadjajBySlugQuery = groq`
  *[_type == "dogadjaj" && slug.current == $slug][0]{ ${dogadjajFields} }
`;

// Club story (singleton)
export const klubStranicaQuery = groq`
  *[_type == "klubStranica"][0]{ uvod, timeline, zavrsniTekst }
`;

// Galleries
export const allGalerijeQuery = groq`
  *[_type == "galerija"] | order(coalesce(godina, 0) desc, date desc){
    _id, name, "slug": slug.current, kategorija, godina, date,
    "cover": images[0], "count": count(images)
  }
`;

export const galerijaSlugsQuery = groq`*[_type == "galerija" && defined(slug.current)].slug.current`;

export const galerijaBySlugQuery = groq`
  *[_type == "galerija" && slug.current == $slug][0]{
    _id, name, "slug": slug.current, kategorija, godina, date, description, images
  }
`;

export const galerijeTeaserQuery = groq`
  *[_type == "galerija"] | order(date desc)[0...$limit]{
    _id, name, "slug": slug.current, date, "cover": images[0], "count": count(images)
  }
`;

// Teams
export const allMomcadiQuery = groq`
  *[_type == "momcad"] | order(order asc){
    _id, name, "slug": slug.current, coverImage, grupnaFotografija,
    popisImena, "brojIgraca": count(igraci), liga
  }
`;

export const momcadSlugsQuery = groq`*[_type == "momcad" && defined(slug.current)].slug.current`;

export const momcadBySlugQuery = groq`
  *[_type == "momcad" && slug.current == $slug][0]{
    _id, name, "slug": slug.current, coverImage, description, gallery,
    grupnaFotografija, popisImena, igraci, trener, liga, terminTreninga
  }
`;

// Board
export const upravaQuery = groq`
  *[_type == "clanUprave"] | order(order asc){
    _id, name, role, phone, image, order
  }
`;

// Sponsors
export const sponzoriQuery = groq`
  *[_type == "sponzor"] | order(order asc){
    _id, name, logo, package, link, packageDescription
  }
`;

// Static pages
export const stranicaBySlugQuery = groq`
  *[_type == "stranica" && slug.current == $slug][0]{
    _id, title, "slug": slug.current, intro, body
  }
`;

// Home stats
export const homeCountsQuery = groq`{
  "novosti": count(*[_type == "novost"]),
  "momcadi": count(*[_type == "momcad"]),
  "galerije": count(*[_type == "galerija"])
}`;

// Site settings (hero photos). Never expose registration fields here.
export const postavkeSajtaQuery = groq`
  *[_type == "postavkeSajta" && _id == "postavke-sajta"][0]{ heroSlike }
`;

// Page-header photos for the three pages that carry one (join / club / sponsoring).
export const pageHeaderSlikeQuery = groq`
  *[_type == "postavkeSajta" && _id == "postavke-sajta"][0]{
    headerPostaniClan, headerKlub, headerSponzoring
  }
`;

// First upcoming event with OPEN team registration → hero "Prijavi ekipu" CTA
// links straight to it; falls back to /dogadjaji when none exists.
export const openTeamEventSlugQuery = groq`
  *[_type == "dogadjaj" && vrstaPrijave == "ekipa" && prijaveOtvorene == true
    && (!defined(rokPrijave) || rokPrijave > now())
    && coalesce(datumKraj, datumPocetak) >= now()]
  | order(datumPocetak asc)[0].slug.current
`;
