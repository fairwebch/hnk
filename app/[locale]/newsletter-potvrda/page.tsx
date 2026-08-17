import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  return { title: t('confirmTitle'), robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <PageHero
        kicker={t('newsletter.kicker')}
        title={t('newsletter.confirmTitle')}
        subtitle={t('newsletter.confirmText')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: 'Newsletter' }]}
        ghost="NEWS"
      />
      <div className="container-x max-w-3xl py-14">
        <Link href="/" className="btn-cta inline-block px-6 py-3.5">
          <span>{t('newsletter.backHome')}</span>
        </Link>
      </div>
    </>
  );
}
