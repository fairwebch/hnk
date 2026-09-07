import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { fetchGalerije } from '@/lib/galerijeApi';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { GalleryBrowser } from '@/components/GalleryBrowser';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gallery' });
  return { title: t('title') };
}

export default async function GalerijaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const galleries = await fetchGalerije();

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
          <GalleryBrowser galleries={galleries} />
        )}
      </div>
    </>
  );
}
