import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hr', 'de'],
  defaultLocale: 'hr',
  // Every route is language-prefixed: /hr/... and /de/...
  localePrefix: 'always',
  // Hrvatski je uvijek zadani jezik, bez obzira na zemlju/uređaj posjetitelja:
  // ne gledaj ni Accept-Language (švicarski preglednici šalju de-CH) ni
  // NEXT_LOCALE kolačić pri otvaranju "/". Njemački je sekundaran i bira se
  // ručno preko LanguageSwitchera (ili direktnim /de linkom).
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
