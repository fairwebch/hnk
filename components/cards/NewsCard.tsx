import { Card, cardImage, cardTitle } from '@/components/ui/Card';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';
import type { Novost } from '@/sanity/lib/types';

export function NewsCard({
  novost,
  locale,
  categoryLabel,
}: {
  novost: Novost;
  locale: string;
  categoryLabel?: string;
}) {
  const title = pickLocale(novost.title, locale);
  const excerpt = pickLocale(novost.excerpt, locale);

  return (
    <Card variant="content" href={`/novosti/${novost.slug}`} className="flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden">
        <SanityImage
          image={novost.coverImage}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className={cardImage}
        />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-3">
          {novost.category && (
            <span className="chip">{categoryLabel ?? novost.category}</span>
          )}
          <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
            {formatDate(novost.date, locale)}
          </time>
        </div>
        <h3 className={`h-display text-[22px] leading-tight mt-2 text-content ${cardTitle}`}>
          {title}
        </h3>
        {excerpt && (
          <p className="font-sans text-sm text-content-soft mt-2 line-clamp-3">{excerpt}</p>
        )}
      </div>
    </Card>
  );
}
