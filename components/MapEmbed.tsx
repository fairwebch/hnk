'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { readConsent, saveConsent, subscribeConsent } from '@/lib/consent';
import { site } from '@/lib/site';

const EMBED_SRC =
  'https://www.google.com/maps?q=Mythencenterstrasse+21,+6438+Ibach&output=embed';

/** Google Maps iframe, rendered ONLY after the visitor consents to external
 *  content — until then a placeholder with a "show map" button. Clicking the
 *  button counts as consent for the external-content category and is stored. */
export function MapEmbed() {
  const t = useTranslations('consent.map');
  // null until mounted → server renders the placeholder, no hydration mismatch
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(readConsent()?.choices.external ?? false);
    return subscribeConsent((c) => setAllowed(c.external));
  }, []);

  if (allowed) {
    return (
      <div className="card overflow-hidden">
        <iframe
          src={EMBED_SRC}
          title={t('title')}
          width="100%"
          height="320"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="card-dashed flex flex-col items-center justify-center text-center px-6 py-10 min-h-[320px]">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-content/40 mb-4">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <div className="font-display font-extrabold uppercase tracking-wider2 text-sm text-ink-800 mb-2">
        {t('title')}
      </div>
      <p className="font-sans text-[13px] text-content/70 leading-relaxed max-w-sm mb-5">
        {t('text')}
      </p>
      <button
        type="button"
        onClick={() => {
          const current = readConsent()?.choices;
          saveConsent({ statistics: current?.statistics ?? false, external: true });
        }}
        className="btn-cta px-6 py-3"
      >
        <span className="text-[13px]">{t('button')}</span>
      </button>
      <a
        href={site.mapsUrl}
        target="_blank"
        rel="noopener"
        className="font-sans font-medium text-xs text-content/60 underline underline-offset-2 mt-3 hover:text-croatia transition-colors"
      >
        {t('external')}
      </a>
    </div>
  );
}
