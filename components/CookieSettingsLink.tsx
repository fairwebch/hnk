'use client';

import { useTranslations } from 'next-intl';
import { openConsentSettings } from '@/lib/consent';

/** Footer link that re-opens the cookie settings dialog (revocation any time). */
export function CookieSettingsLink() {
  const t = useTranslations('consent');
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className="hover:text-white transition-colors underline-offset-2 text-left"
    >
      {t('footerLink')}
    </button>
  );
}
