import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { fetchGalerija, fetchGalerije } from '@/lib/galerijeApi';
import { GalleryGrid } from '@/components/Lightbox';
import { pickLocale, formatDate } from '@/lib/locale';
import { toLightboxCms } from '@/lib/gallery';

export async function generateStaticParams() {
  const galleries = await fetchGalerije();
  return galleries.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const g = await fetchGalerija(slug);
  return { title: g ? pickLocale(g.name, locale) : undefined };
}

export default async function GalerijaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const g = await fetchGalerija(slug);
  if (!g) notFound();

  const name = pickLocale(g.name, locale);
  const description = pickLocale(g.description, locale);
  const images = toLightboxCms(g.images, name);

  return (
    <article>
      <div className="container-x py-12">
        <Link
          href="/galerija"
          className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-content-muted hover:text-croatia transition-colors"
        >
          <span aria-hidden>←</span> {t('gallery.title')}
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-5">
          <h1 className="h-display text-content text-4xl md:text-5xl leading-none">
            {name}
          </h1>
          {g.date && (
            <span className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia">
              {formatDate(g.date, locale)}
            </span>
          )}
        </div>
        {description && (
          <p className="font-sans text-content-soft mt-3 max-w-2xl">{description}</p>
        )}

        <div className="mt-8">
          <GalleryGrid images={images} />
        </div>
      </div>
    </article>
  );
}
