import type { Metadata } from 'next';
import { barlow, barlowCondensed } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Check-in',
  robots: { index: false, follow: false, nocache: true },
};

// Standalone layout (outside the [locale] tree): Croatian-only one-off tool,
// no Header/Footer, no cookie banner.
export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="bg-ink-900 min-h-screen">{children}</body>
    </html>
  );
}
