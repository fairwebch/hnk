import { getTranslations } from 'next-intl/server';
import { fetchStranica } from '@/lib/stranicaApi';
import { PageHero } from '@/components/ui/PageHero';
import { HtmlContent } from '@/components/ui/HtmlContent';
import { EmptyState } from '@/components/ui/EmptyState';
import { pickLocale } from '@/lib/locale';

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
  const page = await fetchStranica(slug);

  const title = page ? pickLocale(page.title, locale) || fallbackTitle : fallbackTitle;
  const intro = page ? pickLocale(page.intro, locale) : '';
  const body = page ? pickLocale(page.bodyHtml, locale) : '';

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
        {body ? (
          <HtmlContent html={body} />
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
  const page = await fetchStranica(slug);
  return { title: page ? pickLocale(page.title, locale) || fallbackTitle : fallbackTitle };
}
