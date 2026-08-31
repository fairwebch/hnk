import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hr', 'de'],
  defaultLocale: 'hr',
  // Every route is language-prefixed: /hr/... and /de/...
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
