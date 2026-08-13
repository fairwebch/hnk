'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { NewsCard } from '@/components/cards/NewsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Novost } from '@/sanity/lib/types';

const CATEGORIES = ['Eventi', 'Novosti', 'Skupština', 'Sport'] as const;

export function NewsList({ news, locale }: { news: Novost[]; locale: string }) {
  const t = useTranslations();
  const [active, setActive] = useState<string>('all');

  // Only show category chips that actually occur in the data.
  const available = useMemo(
    () => CATEGORIES.filter((c) => news.some((n) => n.category === c)),
    [news],
  );

  const filtered = useMemo(
    () => (active === 'all' ? news : news.filter((n) => n.category === active)),
    [news, active],
  );

  if (news.length === 0) {
    return <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />;
  }

  const chip = (key: string, label: string) => {
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
      {available.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {chip('all', t('news.filterAll'))}
          {available.map((c) => chip(c, t(`categories.${c}` as any)))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((n) => (
            <NewsCard
              key={n._id}
              novost={n}
              locale={locale}
              categoryLabel={n.category ? t(`categories.${n.category}` as any) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
