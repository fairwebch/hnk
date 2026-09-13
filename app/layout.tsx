import type { Metadata } from 'next';
import './globals.css';

// Passthrough root layout (required by the App Router). The real <html>/<body>
// live in app/[locale]/layout.tsx and app/studio/layout.tsx so each can set its
// own <html lang>. See next-intl App Router setup.
export const metadata: Metadata = {
  metadataBase: new URL('https://kroatien-schwyz.ch'),
  title: {
    default: 'HNK Kroatien Schwyz',
    template: '%s · HNK Kroatien Schwyz',
  },
  description:
    'Hrvatski nogometni klub u kantonu Schwyz. Od 1995. spajamo sport, prijateljstvo i tradiciju.',
  icons: { icon: '/favicon.svg' },
  // PRIVREMENO tokom selidbe s WordPressa na ovu domenu: dopusti Googleu da
  // crawla (prati stare WP redirecte -> nove URL-ove) ali ne indeksira dok ne
  // potvrdimo da je sve ispravno nakon DNS prekidača. Ukloniti ovo polje čim
  // se potvrdi da sajt radi na kroatien-schwyz.ch.
  robots: { index: false, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
