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
    // /o-nama merged into /klub (club history timeline).
    return [
      { source: '/o-nama', destination: '/klub', permanent: true },
      { source: '/:locale(hr|de)/o-nama', destination: '/:locale/klub', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
