import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { sponzoriQuery } from '@/sanity/lib/queries';
import type { Sponzor } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { pageHeaderSlikeQuery } from '@/sanity/lib/queries';
import { EmptyState } from '@/components/ui/EmptyState';
import { urlFor } from '@/sanity/lib/image';
import { Card } from '@/components/ui/Card';
import { pickLocale } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sponsors' });
  return { title: t('title') };
}

const TIERS = ['Premium', 'Standard', 'Basic'] as const;

export default async function SponzoringPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [sponsors, headers] = await Promise.all([
    sanityFetch<Sponzor[]>(sponzoriQuery, {}, []),
    sanityFetch<{ headerSponzoring?: any } | null>(pageHeaderSlikeQuery, {}, null),
  ]);

  return (
    <>
      <PageHero
        kicker={t('sponsors.kicker')}
        title={t('sponsors.title')}
        subtitle={t('sponsors.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.sponzoring') }]}
        image={headers?.headerSponzoring}
        ghost="PARTNERS"
      />

      {/* Packages */}
      <section className="bg-paper border-b border-line">
        <div className="container-x py-14">
          <h2 className="h-display text-content text-2xl tracking-[.02em] mb-8">
            {t('sponsors.packagesHeading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => {
              const isPremium = tier === 'Premium';
              // Deliberate offer hierarchy: each tier keeps its own border ON TOP
              // of the shared static card base (Premium must stand out).
              const wrap = isPremium
                ? 'border-2 border-croatia'
                : tier === 'Standard'
                  ? 'border-2 border-ink-700'
                  : '';
              return (
                <Card key={tier} tone={isPremium ? 'darkPlain' : 'light'} className={`p-7 flex flex-col ${wrap}`}>
                  {isPremium && (
                    <span className="self-start bg-croatia text-white font-display font-bold uppercase text-[10px] tracking-wider2 px-2.5 py-1 mb-3">
                      {t('sponsors.mostPopular')}
                    </span>
                  )}
                  <h3 className={`h-display text-3xl leading-none ${isPremium ? 'text-white' : 'text-content'}`}>
                    {tier}
                  </h3>
                  <div className="mt-3 flex-1">
                    <ul className={`space-y-2 font-sans text-sm ${isPremium ? 'text-slateblue-200' : 'text-content-soft'}`}>
                      {Array.from({ length: 3 - i > 0 ? 3 - i : 1 }).map((_, k) => (
                        <li key={k} className="flex items-start gap-2">
                          <span className="text-croatia mt-0.5">✓</span>
                          <span>
                            {isPremium
                              ? ['Logo na naslovnici', 'Logo na dresovima', 'Objave na mrežama'][k]
                              : tier === 'Standard'
                                ? ['Logo na stranici sponzora', 'Objave na mrežama'][k] ?? ''
                                : ['Logo na stranici sponzora'][k] ?? ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/kontakt" className="btn-cta mt-6 px-5 py-3 w-fit">
                    <span>{t('sponsors.becomeSponsor')}</span>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sponsor grid */}
      <section className="bg-white">
        <div className="container-x py-14">
          <h2 className="h-display text-content text-2xl tracking-[.02em] mb-8">
            {t('sponsors.ourSponsors')}
          </h2>

          {sponsors.length === 0 ? (
            <EmptyState title={t('empty.sponsors')} subtitle={t('empty.sponsorsSub')} icon="users" />
          ) : (
            <div className="space-y-10">
              {TIERS.map((tier) => {
                const group = sponsors.filter((s) => s.package === tier);
                if (group.length === 0) return null;
                return (
                  <div key={tier}>
                    <h3 className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia mb-4">
                      {tier}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {group.map((s) => {
                        const inner = (
                          <Card variant="plain" className="h-32 flex items-center justify-center p-6">
                            {s.logo?.asset ? (
                              <Image
                                src={urlFor(s.logo).height(140).fit('max').auto('format').url()}
                                alt={s.name}
                                width={220}
                                height={110}
                                className="max-h-20 w-auto object-contain"
                              />
                            ) : (
                              <span className="font-display font-bold text-ink-700 text-lg">{s.name}</span>
                            )}
                          </Card>
                        );
                        return s.link ? (
                          <a
                            key={s._id}
                            href={s.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                            title={s.name}
                          >
                            {inner}
                          </a>
                        ) : (
                          <div key={s._id} className="group" title={s.name}>
                            {inner}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
