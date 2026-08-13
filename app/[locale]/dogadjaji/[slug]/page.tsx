import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { client } from '@/sanity/lib/client';
import { sanityConfigured } from '@/sanity/env';
import { dogadjajBySlugQuery, dogadjajSlugsQuery } from '@/sanity/lib/queries';
import type { Dogadjaj } from '@/sanity/lib/types';
import { SanityImage } from '@/components/ui/SanityImage';
import { PortableText } from '@/components/ui/PortableText';
import { EventCountdown } from '@/components/EventCountdown';
import { pickLocale, pickLocaleBlocks, formatDate } from '@/lib/locale';

export async function generateStaticParams() {
  if (!sanityConfigured) return [];
  try {
    const slugs = await client.fetch<string[]>(dogadjajSlugsQuery);
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
  const d = await sanityFetch<Dogadjaj | null>(dogadjajBySlugQuery, { slug }, null);
  return { title: d ? pickLocale(d.name, locale) : undefined };
}

export default async function DogadjajPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const d = await sanityFetch<Dogadjaj | null>(dogadjajBySlugQuery, { slug }, null);
  if (!d) notFound();

  const name = pickLocale(d.name, locale);
  const body = pickLocaleBlocks(d.description, locale);
  const isUpcoming = new Date(d.date).getTime() > Date.now();

  return (
    <article>
      <section className="relative bg-ink-700 border-b border-slateblue-900 overflow-hidden">
        <div className="sahovnica-strip" />
        {d.coverImage?.asset && (
          <div className="absolute inset-0">
            <SanityImage image={d.coverImage} alt="" fill sizes="100vw" className="object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/80 to-transparent" />
          </div>
        )}
        <div className="container-x relative py-16 md:py-20">
          <Link
            href="/dogadjaji"
            className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300 hover:text-white transition-colors"
          >
            <span aria-hidden>←</span> {t('events.title')}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6 font-display font-bold uppercase text-xs tracking-wider2">
            <span className="text-croatia">
              {formatDate(d.date, locale, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
            {d.location && <span className="text-slateblue-300">· {d.location}</span>}
          </div>
          <h1 className="h-display text-white text-5xl md:text-7xl leading-none mt-4 max-w-4xl">
            {name}
          </h1>

          {isUpcoming && (
            <div className="mt-8">
              <div className="font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-400 mb-3">
                {t('events.countdownTitle')}
              </div>
              <EventCountdown date={d.date} size="lg" />
            </div>
          )}
        </div>
      </section>

      <div className="container-x max-w-3xl py-12">
        {body && body.length > 0 ? (
          <PortableText value={body} />
        ) : (
          <p className="text-content-soft">{t("empty.pageSub")}</p>
        )}
      </div>
    </article>
  );
}
