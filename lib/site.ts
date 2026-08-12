export const site = {
  name: 'HNK Kroatien Schwyz',
  founded: 1995,
  phone: '+41 79 279 72 32',
  phoneHref: 'tel:+41792797232',
  email: 'info@kroatien-schwyz.ch',
  address: 'Igralište Widmen, 6436 Muotathal',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=100092469495528',
    instagram: 'https://www.instagram.com/hnk_kroatienschwyz/',
    whatsapp: 'https://wa.me/41792797232',
  },
};

/** Main navigation — labels come from messages `nav.*`, hrefs are shared across locales. */
export const navItems = [
  { id: 'pocetna', href: '/' },
  { id: 'klub', href: '/klub' },
  { id: 'momcadi', href: '/momcadi' },
  { id: 'novosti', href: '/novosti' },
  { id: 'galerija', href: '/galerija' },
  { id: 'dogadjaji', href: '/dogadjaji' },
  { id: 'sponzoring', href: '/sponzoring' },
  { id: 'kontakt', href: '/kontakt' },
] as const;
