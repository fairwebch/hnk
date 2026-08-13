import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { upravaQuery } from '@/sanity/lib/queries';
import type { ClanUprave } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
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
      <PageHero title={t('board.title')} subtitle={t('board.subtitle')} />
      <div className="container-x py-14">
        {members.length === 0 ? (
          <EmptyState title={t('empty.board')} subtitle={t('empty.boardSub')} icon="users" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m) => (
              <div key={m._id} className="card overflow-hidden">
                <div className="relative aspect-[4/5] bg-line">
                  <SanityImage
                    image={m.image}
                    alt={m.name}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia">
                    {pickLocale(m.role, locale)}
                  </div>
                  <h3 className="h-display text-content text-xl mt-1">{m.name}</h3>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone.replace(/\s/g, '')}`}
                      className="inline-block font-sans text-sm text-content-soft mt-2 hover:text-croatia transition-colors"
                    >
                      {m.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
