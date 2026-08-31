import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { client } from '@/sanity/lib/client';
import { sanityConfigured } from '@/sanity/env';
import { galerijaBySlugQuery, galerijaSlugsQuery } from '@/sanity/lib/queries';
import type { Galerija } from '@/sanity/lib/types';
import { GalleryGrid } from '@/components/Lightbox';
import { pickLocale, formatDate } from '@/lib/locale';
import { toLightbox } from '@/lib/gallery';

export async function generateStaticParams() {
  if (!sanityConfigured) return [];
  try {
    const slugs = await client.fetch<string[]>(galerijaSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const g = await sanityFetch<Galerija | null>(galerijaBySlugQuery, { slug }, null);
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

  const g = await sanityFetch<Galerija | null>(galerijaBySlugQuery, { slug }, null);
  if (!g) notFound();

  const name = pickLocale(g.name, locale);
  const description = pickLocale(g.description, locale);
  const images = toLightbox(g.images, name);

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
