import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { upravaQuery } from '@/sanity/lib/queries';
import type { ClanUprave } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'board' });
  return { title: t('title') };
}

export default async function UpravaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const members = await sanityFetch<ClanUprave[]>(upravaQuery, {}, []);

  return (
    <>
      <PageHero
        kicker={t('board.kicker')}
        title={t('board.title')}
        subtitle={t('board.subtitle')}
        breadcrumb={[
          { label: t('nav.pocetna'), href: '/' },
          { label: t('nav.klub'), href: '/klub' },
          { label: t('board.title') },
        ]}
        ghost="TEAM"
      />
      <div className="container-x py-14">
        {members.length === 0 ? (
          <EmptyState title={t('empty.board')} subtitle={t('empty.boardSub')} icon="users" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {members.map((m) => (
              <Card key={m._id} className="overflow-hidden">
                <div className="relative aspect-[4/5] bg-line">
                  <SanityImage
                    image={m.image}
                    alt={m.name}
                    fill
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 340px"
                    className="object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="font-display font-bold uppercase text-[11px] leading-snug tracking-wider2 text-croatia">
                    {pickLocale(m.role, locale)}
                  </div>
                  <h3 className="h-display text-content text-lg sm:text-xl mt-1">{m.name}</h3>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone.replace(/\s/g, '')}`}
                      className="inline-block font-sans text-sm text-content-soft mt-2 hover:text-croatia transition-colors"
                    >
                      {m.phone}
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
