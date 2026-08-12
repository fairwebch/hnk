import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { client } from '@/sanity/lib/client';
import { sanityConfigured } from '@/sanity/env';
import { novostBySlugQuery, novostSlugsQuery } from '@/sanity/lib/queries';
import type { Novost } from '@/sanity/lib/types';
import { SanityImage } from '@/components/ui/SanityImage';
import { PortableText } from '@/components/ui/PortableText';
import { pickLocale, pickLocaleBlocks, formatDate } from '@/lib/locale';

export async function generateStaticParams() {
  if (!sanityConfigured) return [];
  try {
    const slugs = await client.fetch<string[]>(novostSlugsQuery);
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
  const n = await sanityFetch<Novost | null>(novostBySlugQuery, { slug }, null);
  if (!n) return {};
  return {
    title: pickLocale(n.title, locale),
    description: pickLocale(n.excerpt, locale) || undefined,
  };
}

export default async function NovostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const n = await sanityFetch<Novost | null>(novostBySlugQuery, { slug }, null);
  if (!n) notFound();

  const title = pickLocale(n.title, locale);
  const body = pickLocaleBlocks(n.body, locale);

  return (
    <article>
      <div className="sahovnica-strip" />
      <div className="container-x max-w-3xl py-12">
        <Link
          href="/novosti"
          className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-400 hover:text-white transition-colors"
        >
          <span aria-hidden>←</span> {t('common.backToList')}
        </Link>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          {n.category && (
            <span className="bg-croatia text-white font-display font-bold uppercase text-[11px] tracking-wider2 px-2.5 py-1">
              {t(`categories.${n.category}` as any)}
            </span>
          )}
          <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-400">
            {formatDate(n.date, locale)}
          </time>
        </div>

        <h1 className="font-display font-extrabold text-white text-4xl md:text-5xl leading-tight mt-4">
          {title}
        </h1>
      </div>

      {n.coverImage?.asset && (
        <div className="container-x max-w-4xl">
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-slateblue-900">
            <SanityImage image={n.coverImage} alt={title} fill sizes="100vw" className="object-cover" priority />
          </div>
        </div>
      )}

      <div className="container-x max-w-3xl py-10">
        {body && body.length > 0 ? (
          <PortableText value={body} />
        ) : (
          pickLocale(n.excerpt, locale) && (
            <p className="font-sans text-lg text-slateblue-100 leading-relaxed">
              {pickLocale(n.excerpt, locale)}
            </p>
          )
        )}
      </div>
    </article>
  );
}
