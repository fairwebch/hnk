import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { client } from '@/sanity/lib/client';
import { sanityConfigured } from '@/sanity/env';
import { momcadBySlugQuery, momcadSlugsQuery } from '@/sanity/lib/queries';
import type { Momcad } from '@/sanity/lib/types';
import { SanityImage } from '@/components/ui/SanityImage';
import { PortableText } from '@/components/ui/PortableText';
import { GalleryGrid } from '@/components/Lightbox';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';
import { toLightbox } from '@/lib/gallery';

export async function generateStaticParams() {
  if (!sanityConfigured) return [];
  try {
    const slugs = await client.fetch<string[]>(momcadSlugsQuery);
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
  const team = await sanityFetch<Momcad | null>(momcadBySlugQuery, { slug }, null);
  return { title: team ? pickLocale(team.name, locale) : undefined };
}

export default async function MomcadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const team = await sanityFetch<Momcad | null>(momcadBySlugQuery, { slug }, null);
  if (!team) notFound();

  const name = pickLocale(team.name, locale);
  const desc = pickLocaleBlocks(team.description, locale);
  const gallery = toLightbox(team.gallery, name);

  return (
    <article>
      <section className="relative bg-ink-700 border-b border-slateblue-900">
        <div className="sahovnica-strip" />
        {team.coverImage?.asset && (
          <div className="absolute inset-0">
            <SanityImage image={team.coverImage} alt="" fill sizes="100vw" className="object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/70 to-transparent" />
          </div>
        )}
        <div className="container-x relative py-16 md:py-24">
          <Link
            href="/momcadi"
            className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300 hover:text-white transition-colors"
          >
            <span aria-hidden>←</span> {t('teams.title')}
          </Link>
          <h1 className="font-display font-extrabold text-white uppercase text-5xl md:text-7xl leading-none mt-5">
            {name}
          </h1>
        </div>
      </section>

      <div className="container-x max-w-3xl py-12">
        {desc && desc.length > 0 ? (
          <PortableText value={desc} />
        ) : (
          <p className="text-slateblue-300">{t('empty.pageSub')}</p>
        )}
      </div>

      {gallery.length > 0 && (
        <div className="container-x pb-16">
          <h2 className="font-display font-bold text-white uppercase text-2xl tracking-[.03em] mb-6">
            {t('teams.gallery')}
          </h2>
          <GalleryGrid images={gallery} />
        </div>
      )}
    </article>
  );
}
