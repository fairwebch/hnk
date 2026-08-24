import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { allMomcadiQuery } from '@/sanity/lib/queries';
import type { Momcad } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
import { Card, cardImage, cardTitle } from '@/components/ui/Card';
import { pickLocale } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'teams' });
  return { title: t('title') };
}

export default async function MomcadiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const teams = await sanityFetch<Momcad[]>(allMomcadiQuery, {}, []);

  return (
    <>
      <PageHero
        kicker={t('teams.kicker')}
        title={t('teams.title')}
        subtitle={t('teams.subtitle')}
        breadcrumb={[
          { label: t('nav.pocetna'), href: '/' },
          { label: t('nav.klub'), href: '/klub' },
          { label: t('nav.momcadi') },
        ]}
        ghost="TEAMS"
      />
      <div className="container-x py-14">
        {teams.length === 0 ? (
          <EmptyState title={t('empty.teams')} subtitle={t('empty.teamsSub')} icon="ball" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const name = pickLocale(team.name, locale);
              const photo = team.grupnaFotografija?.asset ? team.grupnaFotografija : team.coverImage;
              // Real head count: roster if filled, otherwise the pictured
              // names from the old site (the "*" placeholder doesn't count).
              const namesCount = (team.popisImena ?? [])
                .flatMap((r) => (r.imena ?? '').split(','))
                .map((n) => n.trim())
                .filter((n) => n && n !== '*').length;
              const count = team.brojIgraca || namesCount;
              const empty = !photo?.asset && !count;

              if (empty) {
                return (
                  <div
                    key={team._id}
                    className="border-2 border-dashed border-line flex flex-col items-center justify-center aspect-[16/10] text-center p-6"
                  >
                    <h3 className="h-display text-content text-2xl leading-none">{name}</h3>
                    <p className="font-display font-bold uppercase text-xs tracking-wider2 text-content-muted mt-2">
                      {t('teams.soon')}
                    </p>
                  </div>
                );
              }

              return (
                <Card
                  key={team._id}
                  variant="content"
                  tone="dark"
                  href={`/momcadi/${team.slug}`}
                  className="block overflow-hidden"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <SanityImage
                      image={photo}
                      alt={name}
                      fill
                      sizes="(max-width:640px) 100vw, 33vw"
                      className={cardImage}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/40 to-ink-900/10" />
                    {count > 0 && (
                      <span className="absolute top-3 right-3 bg-croatia text-white font-display font-bold uppercase text-[11px] tracking-wider2 px-3 py-1.5">
                        {t('teams.playerCount', { count })}
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 p-5">
                      <h3 className={`h-display text-white text-3xl leading-none ${cardTitle}`}>
                        {name}
                      </h3>
                      {pickLocale(team.liga, locale) && (
                        <div className="kicker text-[11px] mt-2">{pickLocale(team.liga, locale)}</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
