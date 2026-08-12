import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { allNovostiQuery } from '@/sanity/lib/queries';
import type { Novost } from '@/sanity/lib/types';
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

  const news = await sanityFetch<Novost[]>(allNovostiQuery, {}, []);

  return (
    <>
      <PageHero title={t('news.title')} subtitle={t('news.subtitle')} />
      <div className="container-x py-14">
        <NewsList news={news} locale={locale} />
      </div>
    </>
  );
}
