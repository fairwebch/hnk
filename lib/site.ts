export const site = {
  name: 'HNK Kroatien Schwyz',
  founded: 1995,
  phone: '+41 79 279 72 32',
  phoneHref: 'tel:+41792797232',
  email: 'info@kroatien-schwyz.ch',
  address: 'Mythencenterstrasse 21, 6438 Ibach',
  mapsUrl: 'https://maps.google.com/?q=Mythencenterstrasse+21,+6438+Ibach',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100092469495528',
    instagram: 'https://www.instagram.com/hnk_kroatienschwyz/',
    whatsapp: 'https://wa.me/41792797232',
  },
};

/** Main navigation — labels come from messages `nav.*`, hrefs are shared across locales.
 *  Home lives on the logo; Shop is a CTA button, not a list item. */
export const navItems = [
  { id: 'novosti', href: '/novosti' },
  { id: 'dogadjaji', href: '/dogadjaji' },
  { id: 'klub', href: '/klub' },
  { id: 'galerija', href: '/galerija' },
  { id: 'sponzoring', href: '/sponzoring' },
  { id: 'kontakt', href: '/kontakt' },
] as const;

/** "Klub" dropdown / accordion sub-group — labels from messages `nav.*`. */
export const klubSubItems = [
  { id: 'oKlubu', href: '/klub' },
  { id: 'uprava', href: '/uprava' },
  { id: 'momcadi', href: '/momcadi' },
  { id: 'postaniClan', href: '/postani-clan' },
] as const;

