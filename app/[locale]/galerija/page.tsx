import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { allGalerijeQuery } from '@/sanity/lib/queries';
import type { Galerija } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale, formatDate } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gallery' });
  return { title: t('title') };
}

export default async function GalerijaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const galleries = await sanityFetch<Galerija[]>(allGalerijeQuery, {}, []);

  return (
    <>
      <PageHero
        kicker={t('gallery.kicker')}
        title={t('gallery.title')}
        subtitle={t('gallery.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.galerija') }]}
        ghost="GALLERY"
      />
      <div className="container-x py-14">
        {galleries.length === 0 ? (
          <EmptyState title={t('empty.gallery')} subtitle={t('empty.gallerySub')} icon="photo" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((g) => (
              <Link
                key={g._id}
                href={`/galerija/${g.slug}`}
                className="card card-hover group overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SanityImage
                    image={g.images?.[0]}
                    alt={pickLocale(g.name, locale)}
                    fill
                    sizes="(max-width:640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5">
                    <h3 className="h-display text-white text-xl leading-tight">
                      {pickLocale(g.name, locale)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 font-sans text-xs text-slateblue-300">
                      {g.date && <span>{formatDate(g.date, locale)}</span>}
                      {g.images && (
                        <>
                          <span>·</span>
                          <span>{t('gallery.photoCount', { count: g.images.length })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
