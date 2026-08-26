import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { stranicaBySlugQuery } from '@/sanity/lib/queries';
import type { Stranica } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { pageHeaderSlikeQuery } from '@/sanity/lib/queries';
import { PortableText } from '@/components/ui/PortableText';
import { MembershipForm } from '@/components/MembershipForm';
import { Card } from '@/components/ui/Card';
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

  const [page, headers] = await Promise.all([
    sanityFetch<Stranica | null>(stranicaBySlugQuery, { slug: 'postani-clan' }, null),
    sanityFetch<{ headerPostaniClan?: any } | null>(pageHeaderSlikeQuery, {}, null),
  ]);
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
        image={headers?.headerPostaniClan}
        ghost="ČLAN"
      />
      <div className="prose-x py-14">
        {body && body.length > 0 && (
          <div className="mb-10">
            <PortableText value={body} />
          </div>
        )}
        <Card className="p-6 md:p-8">
          <MembershipForm />
        </Card>
      </div>
    </>
  );
}
