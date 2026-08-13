import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import {
  latestNovostiQuery,
  nextDogadjajQuery,
  upcomingDogadjajiQuery,
  allMomcadiQuery,
  sponzoriQuery,
  galerijeTeaserQuery,
  homeCountsQuery,
} from '@/sanity/lib/queries';
import type { Novost, Dogadjaj, Momcad, Sponzor } from '@/sanity/lib/types';
import { NewsCard } from '@/components/cards/NewsCard';
import { EventCard } from '@/components/cards/EventCard';
import { EventCountdown } from '@/components/EventCountdown';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
import { urlFor } from '@/sanity/lib/image';
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

  const [news, nextEvent, upcoming, teams, sponsors, galleries, counts] =
    await Promise.all([
      sanityFetch<Novost[]>(latestNovostiQuery, { limit: 6 }, []),
      sanityFetch<Dogadjaj | null>(nextDogadjajQuery, {}, null),
      sanityFetch<Dogadjaj[]>(upcomingDogadjajiQuery, {}, []),
      sanityFetch<Momcad[]>(allMomcadiQuery, {}, []),
      sanityFetch<Sponzor[]>(sponzoriQuery, {}, []),
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

  // Upcoming events for the cards row, excluding the one shown in the bar.
  const upcomingRest = nextEvent
    ? upcoming.filter((e) => e._id !== nextEvent._id)
    : upcoming;

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

        <div className="container-x relative py-20 md:py-28 pb-28 md:pb-36">
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
            <Link href="/postani-clan" className="btn-cta px-6 py-3.5">
              <span>{t('home.ctaJoin')}</span>
            </Link>
            <Link href="/kontakt" className="btn-ghost px-6 py-3.5 text-sm">
              {t('home.ctaTeam')} →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS — white card overlapping the hero */}
      <div className="relative z-10 -mt-16 md:-mt-20">
        <div className="container-x">
          <div className="bg-white border border-line shadow-[0_18px_40px_rgba(19,31,51,.12)] grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-line">
            {stats.map((s, i) => (
              <div key={i} className="py-8 md:py-10 px-4 text-center">
                <div className="font-display font-extrabold text-content text-4xl md:text-5xl leading-none">
                  {s.value}
                </div>
                <div className="font-display font-bold uppercase text-[11px] md:text-xs tracking-wider2 text-content-muted mt-2">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEXT EVENT BAR */}
      <section className="bg-paper">
        <div className="container-x pt-12">
          <div className="bg-ink-700 border border-slateblue-700 px-6 md:px-8 py-6 flex flex-col lg:flex-row lg:items-center gap-6">
            {nextEvent ? (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-croatia animate-pulse" />
                    <span className="kicker text-[11px]">{t('home.nextEvent')}</span>
                  </div>
                  <div className="h-display text-white text-2xl md:text-3xl leading-none">
                    {pickLocale(nextEvent.name, locale)}
                  </div>
                  <div className="mt-2 font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-300">
                    <span className="text-croatia">
                      {formatDate(nextEvent.datumPocetak, locale, {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    {nextEvent.location && <span> · {nextEvent.location}</span>}
                  </div>
                </div>
                <EventCountdown date={nextEvent.datumPocetak} size="md" />
                <Link href={`/dogadjaji/${nextEvent.slug}`} className="btn-cta px-5 py-3 w-fit">
                  <span>{t('home.eventRegister')}</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3 text-slateblue-300 font-display font-bold uppercase text-sm tracking-wider2">
                <span className="w-2.5 h-2.5 rounded-full bg-slateblue-600" />
                {t('home.noUpcoming')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      {upcomingRest.length > 0 && (
        <section className="bg-paper">
          <div className="container-x py-16">
            <SectionHeading
              kicker={t('home.eventsKicker')}
              title={t('home.eventsHeading')}
              href="/dogadjaji"
              linkLabel={t('common.viewAll')}
            />
            <div className="grid grid-cols-1 gap-5">
              {upcomingRest.slice(0, 3).map((d) => (
                <EventCard key={d._id} dogadjaj={d} locale={locale} showCountdown />
              ))}
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

      {/* TEAMS — navy section */}
      {teams.length > 0 && (
        <section className="bg-ink-800">
          <div className="container-x py-16">
            <SectionHeading
              tone="dark"
              kicker={t('home.teamsKicker')}
              title={t('home.teamsHeading')}
              href="/momcadi"
              linkLabel={t('common.viewAll')}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teams.slice(0, 3).map((team, i) => (
                <Link
                  key={team._id}
                  href={`/momcadi/${team.slug}`}
                  className="card-dark group relative overflow-hidden flex flex-col justify-end min-h-[220px] p-6 hover:border-croatia transition-colors"
                >
                  {team.coverImage?.asset && (
                    <div className="absolute inset-0">
                      <SanityImage image={team.coverImage} alt="" fill sizes="33vw" className="object-cover opacity-30" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-550 via-ink-550/80 to-transparent" />
                    </div>
                  )}
                  <span
                    aria-hidden
                    className="absolute -top-4 -left-1 font-display font-extrabold italic text-white/[.06] text-[120px] leading-none pointer-events-none select-none"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative">
                    <h3 className="h-display text-white text-2xl leading-none group-hover:text-croatia transition-colors">
                      {pickLocale(team.name, locale)}
                    </h3>
                    <div className="mt-3 font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia">
                      {t('common.learnMore')} →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
                    <div className="h-display text-white text-sm leading-tight">
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

      {/* CTA BANNER */}
      <section className="relative overflow-hidden bg-croatia">
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.12] hidden sm:block"
          style={{
            background:
              'repeating-conic-gradient(#FFFFFF 0% 25%, transparent 0% 50%) 0 0 / 24px 24px',
          }}
        />
        <div className="container-x py-14 relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="h-display text-white text-3xl md:text-4xl leading-none">
              {t('home.ctaTitle')}
            </h2>
            <p className="font-sans text-white/85 mt-3 max-w-xl leading-relaxed">
              {t('home.ctaText')}
            </p>
          </div>
          <Link
            href="/postani-clan"
            className="inline-flex items-center bg-white px-7 py-4 w-fit shadow-[0_8px_20px_rgba(0,0,0,.18)] hover:bg-paper transition-colors [transform:skewX(-8deg)]"
          >
            <span className="font-display font-extrabold uppercase tracking-wider2 text-croatia [transform:skewX(8deg)]">
              {t('home.ctaJoin')}
            </span>
          </Link>
        </div>
      </section>

      {/* PARTNERS STRIP */}
      {sponsors.length > 0 && (
        <section className="bg-paper border-t border-line">
          <div className="container-x py-14">
            <div className="text-center mb-10">
              <div className="kicker text-xs mb-2">{t('home.partnersKicker')}</div>
              <h2 className="h-display text-content text-2xl md:text-3xl">
                {t('home.partnersHeading')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {sponsors.map((s) =>
                s.logo?.asset ? (
                  <div
                    key={s._id}
                    className="bg-white border border-line h-24 w-40 flex items-center justify-center p-5"
                  >
                    <Image
                      src={urlFor(s.logo).height(120).fit('max').auto('format').url()}
                      alt={s.name}
                      width={180}
                      height={90}
                      className="max-h-14 w-auto object-contain"
                    />
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
