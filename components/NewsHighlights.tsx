import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';
import type { Novost } from '@/sanity/lib/types';

/**
 * Home "latest news": one featured story (photo left, white panel right)
 * plus up to four teasers below. Panels keep the site's sharp corners with a
 * diagonal cut on the bottom-right — the same 45° as the sahovnica strip.
 * The teaser grid picks a column count that always fills its rows, so any
 * story count from 1 to 5 lays out without a gap.
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

  // 3 teasers fill one row of three; 1, 2 and 4 fill rows of two.
  const threeUp = rest.length === 3;
  const cols = threeUp ? 'md:grid-cols-3' : 'md:grid-cols-2';
  const teaserSizes = threeUp
    ? '(max-width:768px) 100vw, (max-width:1200px) 33vw, 390px'
    : '(max-width:768px) 100vw, (max-width:1200px) 50vw, 600px';

  return (
    <div className="flex flex-col gap-6">
      <FeaturedCard novost={featured} locale={locale} categoryLabel={label(featured)} />
      {rest.length > 0 && (
        <div className={`grid grid-cols-1 ${cols} gap-6`}>
          {rest.map((n) => (
            <TeaserCard
              key={n._id}
              novost={n}
              locale={locale}
              categoryLabel={label(n)}
              sizes={teaserSizes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const CARD =
  'group relative bg-white corner-cut shadow-[0_2px_10px_rgba(19,31,51,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(19,31,51,.13)]';

function FeaturedCard({
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
      className={`${CARD} grid grid-cols-1 md:grid-cols-[1.15fr_1fr] [--cut:26px] md:[--cut:38px]`}
    >
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[360px] overflow-hidden">
        <SanityImage
          image={novost.coverImage}
          alt={title}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1200px) 55vw, 660px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-6 md:p-9 lg:p-10 flex flex-col justify-center">
        <h3 className="h-display text-content text-[26px] md:text-[34px] lg:text-[38px] leading-[1.02] group-hover:text-croatia transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="font-sans text-[15px] md:text-base text-content-soft leading-relaxed mt-4 line-clamp-3">
            {excerpt}
          </p>
        )}
        <MetaRow novost={novost} locale={locale} categoryLabel={categoryLabel} className="mt-6" />
      </div>
    </Link>
  );
}

function TeaserCard({
  novost,
  locale,
  categoryLabel,
  sizes,
}: {
  novost: Novost;
  locale: string;
  categoryLabel?: string;
  sizes: string;
}) {
  const title = pickLocale(novost.title, locale);

  return (
    <Link
      href={`/novosti/${novost.slug}`}
      className={`${CARD} flex flex-col [--cut:22px] md:[--cut:26px]`}
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
