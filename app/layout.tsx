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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
