import { Link } from '@/i18n/navigation';
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
    <Link
      href={`/novosti/${novost.slug}`}
      className="card card-hover group flex flex-col"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <SanityImage
          image={novost.coverImage}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {novost.category && (
          <span className="absolute top-3 left-3 bg-croatia text-white font-display font-bold uppercase text-[11px] tracking-wider2 px-2.5 py-1">
            {categoryLabel ?? novost.category}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
          {formatDate(novost.date, locale)}
        </time>
        <h3 className="h-display text-[22px] leading-tight mt-2 text-content group-hover:text-croatia transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="font-sans text-sm text-content-soft mt-2 line-clamp-3">{excerpt}</p>
        )}
      </div>
    </Link>
  );
}
