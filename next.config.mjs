import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
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
