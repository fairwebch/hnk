import { getTranslations } from 'next-intl/server';
import { sanityFetch } from '@/sanity/lib/fetch';
import { stranicaBySlugQuery } from '@/sanity/lib/queries';
import type { Stranica } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { PortableText } from '@/components/ui/PortableText';
import { EmptyState } from '@/components/ui/EmptyState';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';

/**
 * Renders a CMS-driven static page (stranica) by slug. Falls back to a
 * localized title/empty-state when the document doesn't exist yet.
 */
export async function CmsPage({
  slug,
  locale,
  fallbackTitle,
  fallbackSubtitle,
  kicker,
  ghost,
}: {
  slug: string;
  locale: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  kicker?: string;
  ghost?: string;
}) {
  const t = await getTranslations();
  const page = await sanityFetch<Stranica | null>(stranicaBySlugQuery, { slug }, null);

  const title = page ? pickLocale(page.title, locale) || fallbackTitle : fallbackTitle;
  const intro = page ? pickLocale(page.intro, locale) : '';
  const body = page ? pickLocaleBlocks(page.body, locale) : undefined;

  return (
    <>
      <PageHero
        kicker={kicker}
        title={title}
        subtitle={intro || fallbackSubtitle}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: title }]}
        ghost={ghost}
      />
      <div className="prose-x py-14">
        {body && body.length > 0 ? (
          <PortableText value={body} />
        ) : (
          <EmptyState title={t('empty.page')} subtitle={t('empty.pageSub')} icon="ball" />
        )}
      </div>
    </>
  );
}

export async function stranicaMetadata(
  slug: string,
  locale: string,
  fallbackTitle: string,
) {
  const page = await sanityFetch<Stranica | null>(stranicaBySlugQuery, { slug }, null);
  return { title: page ? pickLocale(page.title, locale) || fallbackTitle : fallbackTitle };
}
