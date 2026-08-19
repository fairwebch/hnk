import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/fetch';
import { stranicaBySlugQuery } from '@/sanity/lib/queries';
import type { Stranica } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { ContactForm } from '@/components/ContactForm';
import { MapEmbed } from '@/components/MapEmbed';
import { PortableText } from '@/components/ui/PortableText';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';
import { site } from '@/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: t('title') };
}

export default async function KontaktPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const page = await sanityFetch<Stranica | null>(stranicaBySlugQuery, { slug: 'kontakt' }, null);
  const intro = page ? pickLocale(page.intro, locale) : '';
  const body = page ? pickLocaleBlocks(page.body, locale) : undefined;

  return (
    <>
      <PageHero
        kicker={t('contact.kicker')}
        title={t('contact.title')}
        subtitle={intro || t('contact.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.kontakt') }]}
        ghost="CONTACT"
      />
      <div className="container-x py-14 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12">
        {/* Info */}
        <div>
          <div className="space-y-6">
            <InfoRow heading={t('contact.addressHeading')} value={site.address} href={site.mapsUrl} />
            <InfoRow heading={t('contact.phoneHeading')} value={site.phone} href={site.phoneHref} />
            <InfoRow heading={t('contact.emailHeading')} value={site.email} href={`mailto:${site.email}`} />
          </div>
          {body && body.length > 0 && (
            <div className="mt-8">
              <PortableText value={body} />
            </div>
          )}
          <div className="mt-8">
            <MapEmbed />
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <ContactForm />
        </div>
      </div>
    </>
  );
}

function InfoRow({ heading, value, href }: { heading: string; value: string; href?: string }) {
  return (
    <div>
      <div className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia mb-1">
        {heading}
      </div>
      {href ? (
        <a
          href={href}
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
          className="font-sans text-lg text-content hover:text-croatia transition-colors"
        >
          {value}
        </a>
      ) : (
        <span className="font-sans text-lg text-content">{value}</span>
      )}
    </div>
  );
}
