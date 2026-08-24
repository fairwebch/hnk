import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { upcomingDogadjajiQuery, pastDogadjajiQuery } from '@/sanity/lib/queries';
import type { Dogadjaj } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCard } from '@/components/cards/EventCard';
import { Card } from '@/components/ui/Card';
import { EventCountdown } from '@/components/EventCountdown';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'events' });
  return { title: t('title') };
}

function dateRange(d: Dogadjaj, locale: string) {
  const start = formatDate(d.datumPocetak, locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (d.datumKraj && new Date(d.datumKraj).toDateString() !== new Date(d.datumPocetak).toDateString()) {
    const end = formatDate(d.datumKraj, locale, { day: 'numeric', month: 'long', year: 'numeric' });
    return `${start} – ${end}`;
  }
  return start;
}

export default async function DogadjajiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [upcoming, past] = await Promise.all([
    sanityFetch<Dogadjaj[]>(upcomingDogadjajiQuery, {}, []),
    sanityFetch<Dogadjaj[]>(pastDogadjajiQuery, {}, []),
  ]);

  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <>
      <PageHero
        kicker={t('events.kicker')}
        title={t('events.title')}
        subtitle={t('events.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.dogadjaji') }]}
        ghost="EVENTS"
      />

      <div className="container-x py-14 space-y-16">
        {/* FEATURED next event */}
        {featured ? (
          <section>
            <div className="kicker text-xs mb-4">{t('events.featuredKicker')} · {t('events.next')}</div>
            <Card tone="dark" className="overflow-hidden">
              {featured.coverImage?.asset && (
                <div className="absolute inset-0">
                  <SanityImage image={featured.coverImage} alt="" fill sizes="100vw" className="object-cover opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-ink-550 via-ink-550/90 to-ink-550/50" />
                </div>
              )}
              <div className="relative p-8 md:p-12 flex flex-col lg:flex-row lg:items-center gap-8">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {featured.kategorija && <span className="chip">{featured.kategorija}</span>}
                    <span className="font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia">
                      {dateRange(featured, locale)}
                    </span>
                  </div>
                  <h2 className="h-display text-white text-3xl md:text-5xl leading-none">
                    {pickLocale(featured.name, locale)}
                  </h2>
                  {featured.location && (
                    <div className="mt-3 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300">
                      {t('events.locationLabel')}: <span className="text-slateblue-100">{featured.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4 lg:items-end">
                  <EventCountdown date={featured.datumPocetak} size="lg" />
                  <div className="flex gap-3">
                    {featured.prijavaLink && (
                      <a href={featured.prijavaLink} target="_blank" rel="noopener noreferrer" className="btn-cta px-5 py-3">
                        <span>{t('events.register')}</span>
                      </a>
                    )}
                    <Link href={`/dogadjaji/${featured.slug}`} className="btn-ghost px-5 py-3 text-sm">
                      {t('common.learnMore')} →
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        ) : (
          <EmptyState title={t('empty.events')} subtitle={t('empty.eventsSub')} icon="calendar" />
        )}

        {/* Other upcoming */}
        {rest.length > 0 && (
          <section>
            <h2 className="h-display text-content text-2xl tracking-[.02em] mb-6">
              {t('events.allUpcoming')}
            </h2>
            <div className="grid grid-cols-1 gap-5">
              {rest.map((d) => (
                <EventCard key={d._id} dogadjaj={d} locale={locale} showCountdown />
              ))}
            </div>
          </section>
        )}

        {/* Archive of past events */}
        {past.length > 0 && (
          <section id="arhiva">
            <div className="kicker text-xs mb-2">{t('events.archiveKicker')}</div>
            <h2 className="h-display text-content text-2xl tracking-[.02em] mb-6">
              {t('events.archive')}
            </h2>
            <div className="divide-y divide-line border-y border-line">
              {past.map((d) => (
                <div key={d._id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
                  <span className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted w-32 shrink-0">
                    {formatDate(d.datumPocetak, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <Link
                    href={`/dogadjaji/${d.slug}`}
                    className="h-display text-content text-lg hover:text-croatia transition-colors flex-1 min-w-0"
                  >
                    {pickLocale(d.name, locale)}
                  </Link>
                  {d.galerija?.slug && (
                    <Link
                      href={`/galerija/${d.galerija.slug}`}
                      className="font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia hover:text-croatia-dark transition-colors whitespace-nowrap"
                    >
                      {t('events.viewGallery')} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
