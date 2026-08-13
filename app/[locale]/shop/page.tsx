import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { ProductCard } from '@/components/shop/ProductCard';
import { shopProducts, clubShopUrl } from '@/lib/shop';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });
  return { title: t('pageTitle') };
}

export default async function ShopPage({
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
        kicker={t('shop.kicker')}
        title={t('shop.pageTitle')}
        subtitle={t('shop.pageSubtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.shop') }]}
        ghost="SHOP"
      />

      <div className="container-x py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {shopProducts.map((p) => (
            <ProductCard key={p.slug} product={p} buyLabel={t('shop.buy')} />
          ))}
        </div>

        {/* Whole-store banner */}
        <a
          href={clubShopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative mt-14 block overflow-hidden bg-ink-700 hover:bg-ink-550 transition-colors"
        >
          <div
            aria-hidden
            className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.08] hidden sm:block"
            style={{
              background:
                'repeating-conic-gradient(#D8232F 0% 25%, transparent 0% 50%) 0 0 / 24px 24px',
            }}
          />
          <div className="relative p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="kicker text-xs mb-2">{t('shop.kicker')}</div>
              <h2 className="h-display text-white text-2xl md:text-3xl leading-none">
                {t('shop.checkMore')}
              </h2>
              <p className="font-sans text-slateblue-300 mt-2 max-w-xl">
                {t('shop.checkMoreSub')}
              </p>
            </div>
            <span className="btn-cta px-6 py-3.5 shrink-0">
              <span>{t('shop.checkMoreBtn')} →</span>
            </span>
          </div>
        </a>
      </div>
    </>
  );
}
