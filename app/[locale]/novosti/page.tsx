import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { fetchNovosti } from '@/lib/novostiApi';
import { PageHero } from '@/components/ui/PageHero';
import { NewsList } from '@/components/NewsList';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return { title: t('title') };
}

export default async function NovostiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const news = await fetchNovosti();

  return (
    <>
      <PageHero
        kicker={t('news.kicker')}
        title={t('news.title')}
        subtitle={t('news.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.novosti') }]}
        ghost="NEWS"
      />
      <div className="container-x py-14">
        <NewsList news={news} locale={locale} />
      </div>
    </>
  );
}
