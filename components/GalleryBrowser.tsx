'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SanityImage } from '@/components/ui/SanityImage';
import type { GalerijaTeaser } from '@/sanity/lib/types';
import { pickLocale } from '@/lib/locale';

type Cat = 'all' | 'sport' | 'feste';

const yearOf = (g: GalerijaTeaser) =>
  g.godina ?? (g.date ? Number(g.date.slice(0, 4)) : 0);

export function GalleryBrowser({ galleries }: { galleries: GalerijaTeaser[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const [active, setActive] = useState<Cat>('all');

  // Only offer category filters that occur in the data.
  const cats = useMemo(
    () => (['sport', 'feste'] as const).filter((c) => galleries.some((g) => g.kategorija === c)),
    [galleries],
  );

  const groups = useMemo(() => {
    const filtered =
      active === 'all' ? galleries : galleries.filter((g) => g.kategorija === active);
    const byYear = new Map<number, GalerijaTeaser[]>();
    for (const g of filtered) {
      const y = yearOf(g);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(g);
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  }, [galleries, active]);

  const chip = (key: Cat, label: string) => {
    const on = active === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setActive(key)}
        className={`font-display font-bold uppercase text-xs tracking-wider2 px-4 py-2 rounded-full border transition-colors ${
          on
            ? 'bg-croatia border-croatia text-white'
            : 'border-line text-content-soft hover:text-croatia hover:border-croatia'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {chip('all', t('gallery.filterAll'))}
          {cats.map((c) => chip(c, t(c === 'sport' ? 'gallery.catSport' : 'gallery.catFeste')))}
        </div>
      )}

      {groups.map(([year, items]) => (
        <section key={year} className="mb-12 last:mb-0">
          <div className="flex items-center gap-5 mb-6">
            <h2 className="h-display text-3xl md:text-4xl leading-none text-content">
              {year || '—'}
            </h2>
            <div className="flex-1 border-t border-line" aria-hidden />
            <span className="font-sans text-xs text-content-muted whitespace-nowrap">
              {t('gallery.albumCount', { count: items.length })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((g) => (
              <Link
                key={g._id}
                href={`/galerija/${g.slug}`}
                className="card card-hover group overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SanityImage
                    image={g.cover}
                    alt={pickLocale(g.name, locale)}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5">
                    <h3 className="h-display text-white text-xl leading-tight">
                      {pickLocale(g.name, locale)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 font-sans text-xs text-slateblue-300">
                      {g.kategorija && (
                        <span>
                          {t(g.kategorija === 'sport' ? 'gallery.catSport' : 'gallery.catFeste')}
                        </span>
                      )}
                      {typeof g.count === 'number' && g.count > 0 && (
                        <>
                          {g.kategorija && <span>·</span>}
                          <span>{t('gallery.photoCount', { count: g.count })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
