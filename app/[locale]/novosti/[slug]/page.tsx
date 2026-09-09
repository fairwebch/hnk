import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { fetchNovost, fetchNovosti } from '@/lib/novostiApi';
import { CmsImage } from '@/components/ui/CmsImage';
import { HtmlContent } from '@/components/ui/HtmlContent';
import { pickLocale, formatDate } from '@/lib/locale';

export async function generateStaticParams() {
  const news = await fetchNovosti();
  return news.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const n = await fetchNovost(slug);
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

  const n = await fetchNovost(slug);
  if (!n) notFound();

  const title = pickLocale(n.title, locale);
  const body = pickLocale(n.bodyHtml, locale);

  return (
    <article>
      <div className="container-x max-w-3xl py-12">
        <Link
          href="/novosti"
          className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-content-muted hover:text-croatia transition-colors"
        >
          <span aria-hidden>←</span> {t('common.backToList')}
        </Link>

        <div className="flex flex-wrap items-center gap-3 mt-6">
          {n.category && (
            <span className="chip">
              {t(`categories.${n.category}` as any)}
            </span>
          )}
          <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
            {formatDate(n.date, locale)}
          </time>
        </div>

        <h1 className="h-display text-content text-4xl md:text-5xl leading-tight mt-4">
          {title}
        </h1>
      </div>

      {n.coverImage && (
        <div className="container-x max-w-4xl">
          <div className="relative aspect-[16/9] overflow-hidden border border-line">
            <CmsImage image={n.coverImage} alt={title} fill sizes="100vw" className="object-cover" priority />
          </div>
        </div>
      )}

      <div className="container-x max-w-3xl py-10">
        {body ? (
          <HtmlContent html={body} />
        ) : (
          pickLocale(n.excerpt, locale) && (
            <p className="font-sans text-lg text-content-soft leading-relaxed">
              {pickLocale(n.excerpt, locale)}
            </p>
          )
        )}
      </div>
    </article>
  );
}
