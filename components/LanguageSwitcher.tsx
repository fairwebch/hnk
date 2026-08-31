'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  function switchTo(next: string) {
    if (next === locale) return;
    // Preserve current route + dynamic params under the new locale.
    // @ts-expect-error -- params shape is route-dependent
    router.replace({ pathname, params }, { locale: next });
  }

  const pad = size === 'sm' ? 'px-[9px] py-[4px] text-[10px]' : 'px-[13px] py-[5px] text-xs';

  return (
    <div
      className={`flex items-center rounded-full border border-slateblue-700 p-[3px] font-display font-bold tracking-[.1em]`}
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            aria-pressed={active}
            className={`rounded-full uppercase transition-colors ${pad} ${
              active
                ? 'bg-white text-ink-700'
                : 'bg-transparent text-slateblue-400 hover:text-white'
            }`}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
