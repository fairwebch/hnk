import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { fetchDogadjaj, fetchDogadjaji } from '@/lib/dogadjajiApi';
import { CmsImage } from '@/components/ui/CmsImage';
import { HtmlContent } from '@/components/ui/HtmlContent';
import { Card } from '@/components/ui/Card';
import { EventCountdown } from '@/components/EventCountdown';
import { EventRegistration } from '@/components/EventRegistration';
import { pickLocale, formatDate } from '@/lib/locale';
import type { CmsImg } from '@/lib/cmsImage';

/** Logo već sadrži naziv sponzora — nema teksta pored, cijeli logo je link kad postoji sponsor.link. */
function SponsorLogo({ sponsor }: { sponsor: { name?: string; logo?: CmsImg; link?: string } }) {
  const box = (
    <div className="bg-white border border-line h-20 w-40 flex items-center justify-center p-4">
      <Image
        src={sponsor.logo!.medium}
        alt={sponsor.name || ''}
        width={160}
        height={80}
        className="max-h-12 w-auto object-contain"
        unoptimized={sponsor.logo!.isVector}
      />
    </div>
  );
  return sponsor.link ? (
    <a href={sponsor.link} target="_blank" rel="noopener noreferrer" aria-label={sponsor.name}>
      {box}
    </a>
  ) : (
    box
  );
}

export async function generateStaticParams() {
  const { upcoming, past } = await fetchDogadjaji();
  return [...upcoming, ...past].map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await fetchDogadjaj(slug);
  if (!d) return { title: undefined };

  const title = pickLocale(d.name, locale);
  // Flyer (1:1, za newsletter/društvene mreže) je bolji social-preview nego
  // široki cover — fallback na cover ako flyer nije postavljen.
  const socialImage = d.flyerImage?.large ?? d.coverImage?.large;

  return {
    title,
    openGraph: socialImage ? { title, images: [{ url: socialImage }] } : { title },
    twitter: socialImage ? { card: 'summary_large_image', title, images: [socialImage] } : { title },
  };
}

export default async function DogadjajPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const d = await fetchDogadjaj(slug);
  if (!d) notFound();

  const name = pickLocale(d.name, locale);
  const body = pickLocale(d.descriptionHtml, locale);
  const effectiveEnd = d.datumKraj || d.datumPocetak;
  const isUpcoming = new Date(effectiveEnd).getTime() > Date.now();
  const sponsors = d.sponsors ?? [];
  const imaPrijave = d.vrstaPrijave === 'osoba' || d.vrstaPrijave === 'ekipa';

  const dateFull = (v: string) =>
    formatDate(v, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const info: { label: string; value: string }[] = [
    ...(d.prikaziPocetak !== false ? [{ label: t('events.start'), value: dateFull(d.datumPocetak) }] : []),
    ...(d.datumKraj && d.prikaziKraj !== false ? [{ label: t('events.end'), value: dateFull(d.datumKraj) }] : []),
    ...(d.location && d.prikaziLokaciju !== false ? [{ label: t('events.locationLabel'), value: d.location }] : []),
    ...(d.kotizacija && d.prikaziKotizaciju !== false ? [{ label: t('events.kotizacija'), value: d.kotizacija }] : []),
    ...(d.kapacitet && d.prikaziKapacitet !== false ? [{ label: t('events.kapacitet'), value: d.kapacitet }] : []),
  ];

  // CTA gumb u info kartici: anchor na formu ispod (kad je prijava otvorena
  // i na stranici), ili eksterni link kao fallback. Kartica se sama sakriva
  // kad nema ni polja ni gumba za prikazati (bez obzira na prikazi_info_karticu).
  const showRegisterAnchor = imaPrijave && isUpcoming && Boolean(d.prijaveOtvorene);
  const showRegisterExternal = !showRegisterAnchor && Boolean(d.prijavaLink);
  const showRegisterCta = d.prikaziGumbPrijave !== false && (showRegisterAnchor || showRegisterExternal);
  const showInfoCard = d.prikaziInfoKarticu !== false && (info.length > 0 || showRegisterCta);

  // Kad je prijava (EventRegistration) prva/jedina stvar u lijevoj koloni (nema
  // opisa ni programa), njen naslov ("Prijava na događaj") sjedi IZNAD bijele
  // kartice, dok sidebar (flyer/info) nema takav naslov — pa sidebar vizualno
  // kreće više. Gurni sidebar dolje za istu visinu koliko taj naslov+razmak
  // zauzima (izmjereno na stranici), samo u tom točno određenom slučaju —
  // kad opis/program postoje, kolone se već prirodno poravnaju bez ovoga.
  const registrationHeadsColumn = imaPrijave && isUpcoming && !body && !(d.program && d.program.length > 0);

  return (
    <article>
      {/* Navy header */}
      <section className="relative bg-ink-700 overflow-hidden">
        {d.coverImage && (
          <div className="absolute inset-0">
            <CmsImage image={d.coverImage} alt="" fill sizes="100vw" className="object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/80 to-transparent" />
          </div>
        )}
        <div className="container-x relative py-16 md:py-20">
          <Link
            href="/dogadjaji"
            className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300 hover:text-white transition-colors"
          >
            <span aria-hidden>←</span> {t('events.title')}
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            {d.kategorija && <span className="chip">{d.kategorija}</span>}
            <span className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia">
              {formatDate(d.datumPocetak, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="h-display text-white text-5xl md:text-7xl leading-none mt-4 max-w-4xl">
            {name}
          </h1>

          {isUpcoming && (
            <div className="mt-8">
              <div className="font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-400 mb-3">
                {t('events.countdownTitle')}
              </div>
              <EventCountdown date={d.datumPocetak} size="lg" />
            </div>
          )}
        </div>
        <div className="sahovnica-strip" />
      </section>

      {/* Body */}
      <div className="container-x py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-12">
          <div className="min-w-0">
            {body && <HtmlContent html={body} />}

            {/* Program */}
            {d.program && d.program.length > 0 && (
              <div className="mt-10">
                <h2 className="h-display text-content text-2xl tracking-[.02em] mb-5">{t('events.program')}</h2>
                <div className="divide-y divide-line border-y border-line">
                  {d.program.map((p, i) => (
                    <div key={p._key ?? i} className="flex gap-5 py-4">
                      <span className="font-display font-bold uppercase text-sm tracking-wider2 text-croatia w-24 shrink-0">
                        {p.vrijeme}
                      </span>
                      <span className="font-sans text-content-soft">{p.opis}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registration — posljednje u lijevoj koloni: posjetitelj prvo pročita opis/program. */}
            {imaPrijave && isUpcoming && (
              <EventRegistration
                slug={d.slug}
                vrsta={d.vrstaPrijave as 'osoba' | 'ekipa'}
                pristup={d.pristupPrijavi === 'clanovi' ? 'clanovi' : 'javna'}
                otvorene={Boolean(d.prijaveOtvorene)}
                rok={d.rokPrijave}
                kotizacija={d.kotizacija}
                prikaziKotizaciju={d.prikaziKotizaciju}
              />
            )}
          </div>

          {/* Sidebar: flyer prvo (vizualno privlači pažnju), Informacije ispod. */}
          <aside className={`self-start space-y-6 ${registrationHeadsColumn ? 'lg:mt-[108px]' : ''}`}>
            {d.flyerImage && (
              <Card className="p-4">
                <CmsImage image={d.flyerImage} alt="" width={480} height={480} className="w-full object-cover" />
              </Card>
            )}

            {showInfoCard && (
              <Card className="p-6">
                <h2 className="h-display text-content text-xl tracking-[.02em] mb-4">{t('events.infoTitle')}</h2>
                {info.length > 0 && (
                  <dl className="space-y-3">
                    {info.map((row, i) => (
                      <div key={i}>
                        <dt className="font-display font-bold uppercase text-[10px] tracking-wider2 text-content-muted">{row.label}</dt>
                        <dd className="font-sans text-content mt-0.5">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {showRegisterCta && (
                  showRegisterAnchor ? (
                    <a href="#prijava" className="btn-cta mt-6 px-5 py-3 w-full justify-center">
                      <span>{t('events.register')}</span>
                    </a>
                  ) : (
                    <a href={d.prijavaLink} target="_blank" rel="noopener noreferrer" className="btn-cta mt-6 px-5 py-3 w-full justify-center">
                      <span>{t('events.register')}</span>
                    </a>
                  )
                )}
              </Card>
            )}
          </aside>
        </div>

        {/* Event sponsors — puna širina, zadnje na stranici. */}
        {sponsors.length > 0 && (
          <div className="mt-14">
            <h2 className="h-display text-content text-2xl tracking-[.02em] mb-5">{t('events.sponsor')}</h2>
            <div className="flex flex-wrap items-center gap-6">
              {sponsors.map((sponsor, i) =>
                sponsor.logo ? (
                  // Logo već sadrži naziv sponzora — ne duplirati tekstom pored.
                  // Cijeli logo je link na sponsor.link kad postoji.
                  <SponsorLogo key={i} sponsor={sponsor} />
                ) : (
                  <div key={i}>
                    <div className="h-display text-content text-lg">{sponsor.name}</div>
                    {sponsor.link && (
                      <a href={sponsor.link} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-croatia underline underline-offset-2 hover:text-croatia-dark">
                        {t('sponsors.visit')} →
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
