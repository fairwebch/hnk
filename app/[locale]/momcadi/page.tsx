import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { allMomcadiQuery } from '@/sanity/lib/queries';
import type { Momcad } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
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
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.momcadi') }]}
        ghost="TEAMS"
      />
      <div className="container-x py-14">
        {teams.length === 0 ? (
          <EmptyState title={t('empty.teams')} subtitle={t('empty.teamsSub')} icon="ball" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team._id}
                href={`/momcadi/${team.slug}`}
                className="card card-hover group overflow-hidden"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <SanityImage
                    image={team.coverImage}
                    alt={pickLocale(team.name, locale)}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
                  <h3 className="absolute bottom-0 left-0 p-5 h-display text-white text-2xl leading-none group-hover:text-croatia transition-colors">
                    {pickLocale(team.name, locale)}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
