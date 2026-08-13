import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import {
  latestNovostiQuery,
  nextDogadjajQuery,
  galerijeTeaserQuery,
  homeCountsQuery,
} from '@/sanity/lib/queries';
import type { Novost, Dogadjaj } from '@/sanity/lib/types';
import { NewsCard } from '@/components/cards/NewsCard';
import { EventCountdown } from '@/components/EventCountdown';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';
import { site } from '@/lib/site';

type GalleryTeaser = {
  _id: string;
  name: { hr?: string; de?: string };
  slug: string;
  cover?: any;
  count?: number;
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [news, nextEvent, galleries, counts] = await Promise.all([
    sanityFetch<Novost[]>(latestNovostiQuery, { limit: 6 }, []),
    sanityFetch<Dogadjaj | null>(nextDogadjajQuery, {}, null),
    sanityFetch<GalleryTeaser[]>(galerijeTeaserQuery, { limit: 4 }, []),
    sanityFetch<{ novosti: number; momcadi: number; galerije: number }>(
      homeCountsQuery,
      {},
      { novosti: 0, momcadi: 0, galerije: 0 },
    ),
  ]);

  const years = new Date().getFullYear() - site.founded;
  const stats = [
    { value: String(site.founded), label: t('home.stats.founded') },
    { value: `${years}`, label: t('home.stats.years') },
    { value: counts.momcadi > 0 ? `${counts.momcadi}` : '4', label: t('home.stats.teams') },
    { value: '250+', label: t('home.stats.members') },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink-700">
        <div className="sahovnica-strip" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            background:
              'repeating-conic-gradient(#D8232F 0% 25%, transparent 0% 50%) 0 0 / 60px 60px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-1/2 -translate-y-1/2 w-[560px] h-[560px] opacity-[0.08] hidden md:block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="" className="w-full h-full" />
        </div>

        <div className="container-x relative py-20 md:py-28">
          <div className="kicker text-[13px] mb-4">{t('home.heroKicker')}</div>
          {(() => {
            const words = t('home.heroTitle').split(' ');
            const last = words.pop();
            return (
              <h1 className="h-display text-white tracking-[.01em] text-[2.6rem] sm:text-6xl md:text-8xl leading-[0.9] max-w-4xl break-words">
                <span className="block">{words.join(' ')}</span>
                <span className="block text-croatia">{last}</span>
              </h1>
            );
          })()}
          <p className="font-sans text-slateblue-200 mt-6 max-w-xl text-lg md:text-xl leading-relaxed">
            {t('home.heroSubtitle')}
          </p>
          <div className="flex flex-wrap gap-4 mt-9">
            <Link href="/kontakt" className="btn-cta px-6 py-3.5">
              <span>{t('home.ctaTeam')}</span>
            </Link>
            <Link
              href="/postani-clan"
              className="btn-ghost px-6 py-3.5 text-sm"
            >
              {t('home.ctaJoin')}
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-ink-800 border-y border-slateblue-900">
        <div className="container-x grid grid-cols-2 md:grid-cols-4 divide-x divide-slateblue-900">
          {stats.map((s, i) => (
            <div key={i} className="py-8 md:py-10 px-4 text-center first:pl-0">
              <div className="font-display font-extrabold text-white text-4xl md:text-5xl leading-none">
                {s.value}
              </div>
              <div className="font-display font-bold uppercase text-[11px] md:text-xs tracking-wider2 text-slateblue-400 mt-2">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEXT EVENT — the club lives from events */}
      {nextEvent && (
        <section className="bg-ink-700">
          <div className="container-x py-14">
            <div className="relative card-dark overflow-hidden">
              <div className="absolute inset-0">
                <SanityImage
                  image={nextEvent.coverImage}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-800 via-ink-800/90 to-ink-800/40" />
              </div>
              <div className="relative p-8 md:p-12 flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="flex-1">
                  <div className="kicker text-xs mb-3">{t('home.eventsKicker')} · {t('home.nextEvent')}</div>
                  <h2 className="font-display font-extrabold text-white uppercase text-3xl md:text-5xl leading-none">
                    {pickLocale(nextEvent.name, locale)}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300">
                    <span className="text-croatia">
                      {formatDate(nextEvent.date, locale, {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {nextEvent.location && <span>· {nextEvent.location}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-400">
                    {t('events.countdownTitle')}
                  </span>
                  <EventCountdown date={nextEvent.date} size="lg" />
                  <Link href={`/dogadjaji/${nextEvent.slug}`} className="btn-cta px-5 py-3 w-fit">
                    <span>{t('common.learnMore')}</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LATEST NEWS */}
      <section className="bg-paper">
        <div className="container-x py-16">
          <SectionHeading
            kicker={t('home.newsKicker')}
            title={t('home.newsHeading')}
            href="/novosti"
            linkLabel={t('common.viewAll')}
          />
          {news.length === 0 ? (
            <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.slice(0, 6).map((n) => (
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
      </section>

      {/* GALLERY TEASER */}
      <section className="bg-white border-t border-line">
        <div className="container-x py-16">
          <SectionHeading
            kicker={t('home.galleryKicker')}
            title={t('home.galleryHeading')}
            href="/galerija"
            linkLabel={t('common.viewAll')}
          />
          {galleries.length === 0 ? (
            <EmptyState title={t('empty.gallery')} subtitle={t('empty.gallerySub')} icon="photo" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleries.map((g) => (
                <Link
                  key={g._id}
                  href={`/galerija/${g.slug}`}
                  className="group relative aspect-square overflow-hidden border border-line"
                >
                  <SanityImage
                    image={g.cover}
                    alt={pickLocale(g.name, locale)}
                    fill
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <div className="font-display font-bold text-white uppercase text-sm leading-tight">
                      {pickLocale(g.name, locale)}
                    </div>
                    {typeof g.count === 'number' && (
                      <div className="font-sans text-[11px] text-slateblue-300 mt-0.5">
                        {t('gallery.photoCount', { count: g.count })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
