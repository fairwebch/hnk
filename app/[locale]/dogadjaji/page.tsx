import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { upcomingDogadjajiQuery, pastDogadjajiQuery } from '@/sanity/lib/queries';
import type { Dogadjaj } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCard } from '@/components/cards/EventCard';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'events' });
  return { title: t('title') };
}

export default async function DogadjajiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [upcoming, past] = await Promise.all([
    sanityFetch<Dogadjaj[]>(upcomingDogadjajiQuery, {}, []),
    sanityFetch<Dogadjaj[]>(pastDogadjajiQuery, {}, []),
  ]);

  const nothing = upcoming.length === 0 && past.length === 0;

  return (
    <>
      <PageHero title={t('events.title')} subtitle={t('events.subtitle')} />
      <div className="container-x py-14 space-y-14">
        {nothing ? (
          <EmptyState title={t('empty.events')} subtitle={t('empty.eventsSub')} icon="calendar" />
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-white uppercase text-2xl tracking-[.03em] mb-6 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-croatia animate-pulse" />
                  {t('events.upcoming')}
                </h2>
                <div className="grid grid-cols-1 gap-5">
                  {upcoming.map((d) => (
                    <EventCard key={d._id} dogadjaj={d} locale={locale} showCountdown />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="font-display font-bold text-slateblue-300 uppercase text-2xl tracking-[.03em] mb-6">
                  {t('events.past')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-80">
                  {past.map((d) => (
                    <EventCard key={d._id} dogadjaj={d} locale={locale} showCountdown={false} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
