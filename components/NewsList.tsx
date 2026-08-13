'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { NewsCard } from '@/components/cards/NewsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Novost } from '@/sanity/lib/types';

const CATEGORIES = ['Eventi', 'Novosti', 'Skupština', 'Sport'] as const;
const PAGE_SIZE = 9;

export function NewsList({ news, locale }: { news: Novost[]; locale: string }) {
  const t = useTranslations();
  const [active, setActive] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Only show category chips that actually occur in the data.
  const available = useMemo(
    () => CATEGORIES.filter((c) => news.some((n) => n.category === c)),
    [news],
  );

  const filtered = useMemo(
    () => (active === 'all' ? news : news.filter((n) => n.category === active)),
    [news, active],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function selectFilter(key: string) {
    setActive(key);
    setPage(1);
  }
  function goTo(p: number) {
    setPage(p);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (news.length === 0) {
    return <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />;
  }

  const chip = (key: string, label: string) => {
    const on = active === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => selectFilter(key)}
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
      <div className="flex items-center justify-between gap-4 mb-8">
        {available.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chip('all', t('news.filterAll'))}
            {available.map((c) => chip(c, t(`categories.${c}` as any)))}
          </div>
        ) : (
          <span />
        )}
        <span className="hidden sm:block font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted whitespace-nowrap">
          {t('news.count', { count: filtered.length })}
        </span>
      </div>

      {pageItems.length === 0 ? (
        <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pageItems.map((n) => (
            <NewsCard
              key={n._id}
              novost={n}
              locale={locale}
              categoryLabel={n.category ? t(`categories.${n.category}` as any) : undefined}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-12" aria-label="pagination">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const on = p === current;
            return (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                aria-current={on ? 'page' : undefined}
                className={`min-w-[44px] h-11 px-3 font-display font-bold text-sm border transition-colors ${
                  on
                    ? 'bg-croatia border-croatia text-white'
                    : 'bg-white border-line text-content hover:border-croatia hover:text-croatia'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goTo(Math.min(current + 1, totalPages))}
            disabled={current === totalPages}
            aria-label="Sljedeća"
            className="min-w-[44px] h-11 px-3 font-display font-bold text-sm bg-white border border-line text-content hover:border-croatia hover:text-croatia disabled:opacity-40 disabled:hover:border-line disabled:hover:text-content transition-colors"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
