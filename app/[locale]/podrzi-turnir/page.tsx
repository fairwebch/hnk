import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { fetchDogadjaj } from '@/lib/dogadjajiApi';
import { CmsImage } from '@/components/ui/CmsImage';
import { Card } from '@/components/ui/Card';
import { SponsorshipForm } from '@/components/SponsorshipForm';
import { TURNIR_EVENT_SLUG, CLUB_EMAIL, CLUB_PHONE } from '@/lib/turnirSponzorstvo';

// Stranica se dijeli direktnim linkom firmama — nije u navigaciji i ne
// indeksira se. Slike (naslovna + flyer) dolaze s događaja u CMS-u.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sponzorstvo' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sponzorstvo');
  const event = await fetchDogadjaj(TURNIR_EVENT_SLUG);

  const facts: [string, string][] = [
    [t('factSaturday'), t('factSaturdayValue')],
    [t('factSunday'), t('factSundayValue')],
    [t('factVenue'), t('factVenueValue')],
    [t('factClub'), t('factClubValue')],
  ];
  const offers: [string, string][] = [
    [t('offerBannerTitle'), t('offerBannerText')],
    [t('offerFlyerTitle'), t('offerFlyerText')],
    [t('offerOtherTitle'), t('offerOtherText')],
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative bg-ink-700 overflow-hidden">
        {event?.coverImage && (
          <div aria-hidden className="absolute inset-0">
            <CmsImage image={event.coverImage} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-ink-900/55" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-ink-900/20" />
          </div>
        )}
        <div className="container-x relative py-20 md:py-28">
          <div className="kicker text-[13px] mb-4">{t('kicker')}</div>
          <h1 className="h-display text-white tracking-[.02em] text-5xl md:text-7xl leading-[0.95] max-w-4xl">
            {t('title')}
          </h1>
          <p className="font-sans mt-5 max-w-2xl text-lg md:text-xl text-slateblue-100">{t('subtitle')}</p>
          <a href="#forma" className="btn-cta mt-9 px-7 py-4">
            <span>{t('ctaHero')}</span>
          </a>
        </div>
        <div className="sahovnica-strip" />
      </section>

      {/* Turnir ukratko */}
      <section className="container-x py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <div className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia mb-3">{t('aboutKicker')}</div>
            <h2 className="h-display text-content text-3xl md:text-5xl leading-[0.95]">{t('aboutTitle')}</h2>
            <p className="font-sans text-lg text-content-soft mt-6 max-w-xl leading-relaxed">{t('aboutText')}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mt-10 border-t border-line pt-8">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">{label}</dt>
                  <dd className="h-display text-content text-xl mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {event?.flyerImage && (
            <Card className="p-3 md:p-4">
              <CmsImage image={event.flyerImage} alt={t('title')} width={560} height={560} className="w-full h-auto" />
            </Card>
          )}
        </div>
      </section>

      {/* Što nudimo */}
      <section className="bg-white border-y border-line">
        <div className="container-x py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia mb-3">{t('offerKicker')}</div>
            <h2 className="h-display text-content text-3xl md:text-5xl leading-[0.95]">{t('offerTitle')}</h2>
            <p className="font-sans text-lg text-content-soft mt-5">{t('offerIntro')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line mt-10">
            {offers.map(([title, text]) => (
              <div key={title} className="bg-white p-6 md:p-8">
                <div className="w-8 h-[3px] bg-croatia mb-5" aria-hidden />
                <h3 className="h-display text-content text-2xl">{title}</h3>
                <p className="font-sans text-content-soft mt-3">{text}</p>
              </div>
            ))}
          </div>
          <p className="font-sans text-sm text-content-muted mt-5">{t('offerNote')}</p>
        </div>
      </section>

      {/* Forma */}
      <section id="forma" className="scroll-mt-28 container-x py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="h-display text-content text-3xl md:text-5xl leading-[0.95]">{t('formTitle')}</h2>
          <p className="font-sans text-lg text-content-soft mt-4">{t('formIntro')}</p>
          <Card className="p-6 md:p-10 mt-8">
            <SponsorshipForm />
          </Card>
          <p className="font-sans text-sm text-content-muted mt-6 text-center">
            <a href={`mailto:${CLUB_EMAIL}`} className="hover:text-croatia">{CLUB_EMAIL}</a>
            {' · '}
            <a href={`tel:${CLUB_PHONE.replace(/\s/g, '')}`} className="hover:text-croatia">{CLUB_PHONE}</a>
          </p>
        </div>
      </section>
    </>
  );
}
