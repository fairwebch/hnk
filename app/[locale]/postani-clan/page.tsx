import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { stranicaBySlugQuery } from '@/sanity/lib/queries';
import type { Stranica } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { PortableText } from '@/components/ui/PortableText';
import { MembershipForm } from '@/components/MembershipForm';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';
import { stranicaMetadata } from '@/components/CmsPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'footer.links' });
  return stranicaMetadata('postani-clan', locale, t('postaniClan'));
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const page = await sanityFetch<Stranica | null>(stranicaBySlugQuery, { slug: 'postani-clan' }, null);
  const title = (page && pickLocale(page.title, locale)) || t('footer.links.postaniClan');
  const intro = page ? pickLocale(page.intro, locale) : '';
  const body = page ? pickLocaleBlocks(page.body, locale) : undefined;

  return (
    <>
      <PageHero
        kicker={t('pages.postaniClanKicker')}
        title={title}
        subtitle={intro || t('membership.subtitle')}
        breadcrumb={[
          { label: t('nav.pocetna'), href: '/' },
          { label: t('nav.klub'), href: '/klub' },
          { label: title },
        ]}
        ghost="ČLAN"
      />
      <div className="container-x max-w-3xl py-14">
        {body && body.length > 0 && (
          <div className="mb-10">
            <PortableText value={body} />
          </div>
        )}
        <div className="card p-6 md:p-8">
          <MembershipForm />
        </div>
      </div>
    </>
  );
}
