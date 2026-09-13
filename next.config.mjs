import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Sve slike sadržaja dolaze sa self-hosted PHP CMS-a — vidi hostpoint-cms/README.md.
      { protocol: 'https', hostname: 'api.kroatien-schwyz.ch' },
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: 'http', hostname: '127.0.0.1', port: '8098' }]
        : []),
    ],
  },
  async redirects() {
    return [
      // /o-nama merged into /klub (club history timeline).
      { source: '/o-nama', destination: '/klub', permanent: true },
      { source: '/:locale(hr|de)/o-nama', destination: '/:locale/klub', permanent: true },

      // ---------------------------------------------------------------------
      // Selidba sa starog WordPressa (kroatien-schwyz.ch) na ovaj Next.js sajt.
      // Statični 1:1 parovi (stranice, galerije, eventi) — vidi
      // scripts/migration/redirect-map.json za potpuni inventar, izvore i
      // obrazloženje svake odluke. Datumski-prefiksirani novosti permalinci
      // (WP /god/mj/dan/slug/) NISU ovdje — ti idu kroz middleware.ts jer im
      // treba wildcard na varijabilni datum + iznimka za jedan slug.
      // ---------------------------------------------------------------------

      // NextGEN galerije: pojedinačni albumi + dva kategorija-indeksa.
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2024', destination: '/hr/galerija/malonogometni-turnir-2024', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2023', destination: '/hr/galerija/malonogometni-turnir-2023', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2017', destination: '/hr/galerija/malonogometni-turnir-2017', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2016', destination: '/hr/galerija/malonogometni-turnir-2016', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2014', destination: '/hr/galerija/malonogometni-turnir-2014', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2013', destination: '/hr/galerija/malonogometni-turnir-2013', permanent: true },
      { source: '/sport-turniri/nggallery/album/malonogometni-turnir-2012', destination: '/hr/galerija/malonogometni-turnir-2012', permanent: true },
      { source: '/sport-turniri/nggallery/album/turnir-prstena-2023', destination: '/hr/galerija/turnir-prstena-2023', permanent: true },
      { source: '/sport-turniri/nggallery/album/prsten-2011', destination: '/hr/galerija/prsten-2011', permanent: true },
      { source: '/sport-turniri/nggallery/album/prsten-2014', destination: '/hr/galerija/prsten-2014', permanent: true },
      // prsten-2015 (gid20) je prazna napuštena galerija (0 slika) — pravi sadržaj je prsten-2015-5 (gid21, 20 slika).
      { source: '/sport-turniri/nggallery/album/prsten-2015', destination: '/hr/galerija/prsten-2015-5', permanent: true },
      { source: '/sport-turniri/nggallery/album/prsten-2015-5', destination: '/hr/galerija/prsten-2015-5', permanent: true },
      { source: '/sport-turniri/nggallery/album/prsten-2017', destination: '/hr/galerija/prsten-2017', permanent: true },
      { source: '/sport-turniri/nggallery/album/prsten-2018', destination: '/hr/galerija/prsten-2018', permanent: true },
      { source: '/zabave-feste/nggallery/album/zabavna-vecer-2026', destination: '/hr/galerija/zabavna-vecer-2026', permanent: true },
      { source: '/zabave-feste/nggallery/album/film-diva', destination: '/hr/galerija/film-diva', permanent: true },
      { source: '/zabave-feste/nggallery/album/europapark-2025', destination: '/hr/galerija/europapark-2025', permanent: true },
      { source: '/zabave-feste/nggallery/album/zabavna-vecer-2025', destination: '/hr/galerija/zabavna-vecer-2025', permanent: true },
      { source: '/zabave-feste/nggallery/album/izlet-u-muotathal-2024', destination: '/hr/galerija/izlet-u-muotathal-2024', permanent: true },
      { source: '/zabave-feste/nggallery/album/zabavna-vecer-2024', destination: '/hr/galerija/zabavna-vecer-2024', permanent: true },
      { source: '/zabave-feste/nggallery/album/grill-morschach-2023', destination: '/hr/galerija/grill-morschach-2023', permanent: true },
      { source: '/zabave-feste/nggallery/album/godisnja-skupstina-2014', destination: '/hr/galerija/godisnja-skupstina-2014', permanent: true },
      { source: '/zabave-feste/nggallery/album/dan-zena-2014', destination: '/hr/galerija/dan-zena-2014', permanent: true },
      { source: '/zabave-feste/nggallery/album/dan-zena-2013', destination: '/hr/galerija/dan-zena-2013', permanent: true },
      { source: '/zabave-feste/nggallery/album/ljetna-zabava-2013', destination: '/hr/galerija/ljetna-zabava-2013', permanent: true },
      { source: '/zabave-feste/nggallery/album/proljetna-zabava-2012', destination: '/hr/galerija/proljetna-zabava-2012', permanent: true },
      { source: '/zabave-feste/nggallery/album/bozicna-vecera-2012', destination: '/hr/galerija/bozicna-vecera-2012', permanent: true },
      { source: '/zabave-feste/nggallery/album/dan-zena-2012', destination: '/hr/galerija/dan-zena-2012', permanent: true },
      { source: '/zabave-feste/nggallery/album/godisnja-skupstina-2012', destination: '/hr/galerija/godisnja-skupstina-2012', permanent: true },
      { source: '/zabave-feste/nggallery/album/zabava-9-februara-2008', destination: '/hr/galerija/zabava-9-februara-2008', permanent: true },
      { source: '/zabave-feste/nggallery/album/zabava-19-novembra-2006', destination: '/hr/galerija/zabava-19-novembra-2006', permanent: true },
      { source: '/sport-turniri', destination: '/hr/galerija', permanent: true },
      { source: '/zabave-feste', destination: '/hr/galerija', permanent: true },

      // Statične stranice — izravni pandani.
      { source: '/klub', destination: '/hr/klub', permanent: true },
      { source: '/kontakt', destination: '/hr/kontakt', permanent: true },
      { source: '/postani-clan', destination: '/hr/postani-clan', permanent: true },
      { source: '/uprava', destination: '/hr/uprava', permanent: true },
      { source: '/impressum', destination: '/hr/impressum', permanent: true },
      { source: '/galerija', destination: '/hr/galerija', permanent: true },
      { source: '/momcadi', destination: '/hr/momcadi', permanent: true },
      { source: '/juniori', destination: '/hr/momcadi/juniori', permanent: true },
      { source: '/seniori', destination: '/hr/momcadi/seniori', permanent: true },
      { source: '/aktivni', destination: '/hr/momcadi/aktivni', permanent: true },
      { source: '/blog', destination: '/hr/novosti', permanent: true },
      // Stari /shop/ je već 301-ao na 11teamsports.com; novi /shop prikazuje iste
      // proizvode s eksternim "kupi" linkovima — bolje odredište od golog bouncea.
      { source: '/shop', destination: '/hr/shop', permanent: true },
      // Wp slug bez crtice (ne "/o-nama") — isti spoj kao interni redirect gore.
      { source: '/onama', destination: '/hr/klub', permanent: true },
      // Pažnja: različit spelling od novog route-a (nema "ae").
      { source: '/datenschutzerklaerung', destination: '/hr/datenschutzerklarung', permanent: true },
      { source: '/sponsoring-vereinsfest', destination: '/hr/sponzoring', permanent: true },

      // Statične stranice — napuštene "članske tarife" (prazne/samo-forma), konsolidirano u postani-clan.
      { source: '/basic', destination: '/hr/postani-clan', permanent: true },
      { source: '/premium', destination: '/hr/postani-clan', permanent: true },
      { source: '/standard', destination: '/hr/postani-clan', permanent: true },

      // Statične stranice — jednokratne/prazne, bez izravnog pandana (nadređeni indeksi).
      { source: '/festa', destination: '/hr/dogadjaji', permanent: true },
      { source: '/skupstina', destination: '/hr/novosti', permanent: true },
      // 'Turnir 2025' prijavna forma za prošli turnir -> trenutno aktivna prijava.
      { source: '/turnir', destination: '/hr/dogadjaji/malonogometni-turnir-2026', permanent: true },

      // The Events Calendar (Tribe Events).
      { source: '/events', destination: '/hr/dogadjaji', permanent: true },
      // Događaj je prošao, odgovarajuća galerija postoji na novom sajtu.
      { source: '/event/zabavna-vecer-2026', destination: '/hr/galerija/zabavna-vecer-2026', permanent: true },
      // Slug je 'test', ali sadržaj potvrđuje da je stvarni, indeksirani izlet za 30. obljetnicu.
      { source: '/event/test', destination: '/hr/novosti/izlet-u-europapark-povodom-30-obljetnice-17-05-2025', permanent: true },
      { source: '/event/europa-park', destination: '/hr/dogadjaji', permanent: true },
      { source: '/event/brunnen-kocht-2025', destination: '/hr/dogadjaji', permanent: true },
      { source: '/event/malonogometni-turnir-2025', destination: '/hr/dogadjaji', permanent: true },

      // WooCommerce: proizvodi već 404-aju na starom sajtu (nisu indeksirani) — sigurnosna mreža.
      { source: '/product/:path*', destination: '/hr/shop', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
