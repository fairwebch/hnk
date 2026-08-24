import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';
import type { Novost } from '@/sanity/lib/types';

/**
 * Home "latest news" in the compact reference layout: on desktop the featured
 * story is only WIDER than the teasers — it shares the first row with one of
 * them, so its height equals a teaser row and the whole section stays short.
 * One 6-column grid; per-count span maps keep every row full (no holes) for
 * any story count from 1 to 5. Panels keep the diagonal bottom-right cut.
 */
export async function NewsHighlights({
  items,
  locale,
}: {
  items: Novost[];
  locale: string;
}) {
  const t = await getTranslations();
  if (items.length === 0) return null;

  const [featured, ...rest] = items.slice(0, 5);
  const label = (n: Novost) =>
    n.category ? t(`categories.${n.category}` as any) : undefined;

  // lg spans on the 6-col grid, chosen so every row is full:
  //   4 teasers → [feat 4 + t 2] / [2, 2, 2]
  //   3 teasers → [feat 4 + t 2] / [3, 3]
  //   2 teasers → [feat 6] / [3, 3]   (a lone half-row teaser would be a hole)
  //   1 teaser  → [feat 4 + t 2]
  //   0         → [feat 6]
  const n = rest.length;
  const featSpan = n === 0 || n === 2 ? 'lg:col-span-6' : 'lg:col-span-4';
  const teaserSpans: Record<number, string[]> = {
    1: ['lg:col-span-2'],
    2: ['lg:col-span-3', 'lg:col-span-3'],
    3: ['lg:col-span-2', 'lg:col-span-3', 'lg:col-span-3'],
    4: ['lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2'],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      <FeaturedCard
        novost={featured}
        locale={locale}
        categoryLabel={label(featured)}
        className={`md:col-span-2 ${featSpan}`}
      />
      {rest.map((novost, i) => (
        <TeaserCard
          key={novost._id}
          novost={novost}
          locale={locale}
          categoryLabel={label(novost)}
          className={teaserSpans[n][i]}
          sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 420px"
        />
      ))}
    </div>
  );
}

const CARD =
  'group relative bg-white corner-cut shadow-[0_2px_10px_rgba(19,31,51,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(19,31,51,.13)]';

function FeaturedCard({
  novost,
  locale,
  categoryLabel,
  className = '',
}: {
  novost: Novost;
  locale: string;
  categoryLabel?: string;
  className?: string;
}) {
  const title = pickLocale(novost.title, locale);
  const excerpt = pickLocale(novost.excerpt, locale);

  return (
    <Link
      href={`/novosti/${novost.slug}`}
      className={`${CARD} grid grid-cols-1 md:grid-cols-[1.15fr_1fr] [--cut:26px] md:[--cut:34px] ${className}`}
    >
      {/* Height comes from the grid row (≈ a teaser card); the image just covers. */}
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px] md:h-full overflow-hidden">
        <SanityImage
          image={novost.coverImage}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 440px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-6 md:p-7 flex flex-col justify-center">
        <h3 className="h-display text-content text-[26px] lg:text-[30px] leading-[1.04] group-hover:text-croatia transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="font-sans text-[15px] text-content-soft leading-relaxed mt-3 line-clamp-2">
            {excerpt}
          </p>
        )}
        <MetaRow novost={novost} locale={locale} categoryLabel={categoryLabel} className="mt-5" />
      </div>
    </Link>
  );
}

function TeaserCard({
  novost,
  locale,
  categoryLabel,
  sizes,
  className = '',
}: {
  novost: Novost;
  locale: string;
  categoryLabel?: string;
  sizes: string;
  className?: string;
}) {
  const title = pickLocale(novost.title, locale);

  return (
    <Link
      href={`/novosti/${novost.slug}`}
      className={`${CARD} flex flex-col [--cut:22px] md:[--cut:26px] ${className}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <SanityImage
          image={novost.coverImage}
          alt={title}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-5 md:p-6 flex flex-col flex-1">
        <h3 className="h-display text-content text-[20px] md:text-[22px] leading-[1.06] group-hover:text-croatia transition-colors">
          {title}
        </h3>
        <MetaRow
          novost={novost}
          locale={locale}
          categoryLabel={categoryLabel}
          className="mt-auto pt-4"
        />
      </div>
    </Link>
  );
}

function MetaRow({
  novost,
  locale,
  categoryLabel,
  className = '',
}: {
  novost: Novost;
  locale: string;
  categoryLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {novost.category && (
        <span className="kicker text-[11px]">{categoryLabel ?? novost.category}</span>
      )}
      <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
        {formatDate(novost.date, locale)}
      </time>
    </div>
  );
}
