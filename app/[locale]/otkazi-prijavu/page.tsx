import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { CancelRegistration } from '@/components/CancelRegistration';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'prijava' });
  return { title: t('otkaziTitle'), robots: { index: false } };
}

export default async function OtkaziPrijavuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        title={t('prijava.otkaziTitle')}
        subtitle={t('prijava.otkaziSubtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('prijava.otkaziTitle') }]}
        ghost="CANCEL"
      />
      <div className="container-x py-14 max-w-2xl">
        <CancelRegistration />
      </div>
    </>
  );
}
