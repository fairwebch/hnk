export type LocaleValue = { hr?: string | null; de?: string | null } | null | undefined;

/**
 * Pick a localized string, falling back to HR when the requested locale is
 * empty (brief: never invent a DE translation — show HR instead of blank).
 */
export function pickLocale(value: LocaleValue, locale: string): string {
  if (!value) return '';
  const wanted = (value as Record<string, string | null | undefined>)[locale];
  if (wanted && wanted.trim()) return wanted;
  return value.hr?.trim() ? value.hr : '';
}

/** Localized portable-text: return the requested locale's blocks, else HR. */
export function pickLocaleBlocks<T>(
  value: { hr?: T; de?: T } | null | undefined,
  locale: string,
): T | undefined {
  if (!value) return undefined;
  const wanted = (value as Record<string, T>)[locale];
  const hasContent = Array.isArray(wanted) ? wanted.length > 0 : Boolean(wanted);
  if (hasContent) return wanted;
  return value.hr;
}

const DATE_LOCALE: Record<string, string> = { hr: 'hr-HR', de: 'de-CH' };

export function formatDate(
  iso: string | undefined | null,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE[locale] ?? 'hr-HR', opts).format(
      new Date(iso),
    );
  } catch {
    return '';
  }
}
