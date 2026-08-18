import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { klubStranicaQuery } from '@/sanity/lib/queries';
import type { KlubStranica, TimelineStavka } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { PortableText } from '@/components/ui/PortableText';
import { EmptyState } from '@/components/ui/EmptyState';
import { urlFor } from '@/sanity/lib/image';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('oKlubu') };
}

export default async function KlubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const doc = await sanityFetch<KlubStranica | null>(klubStranicaQuery, {}, null);
  const uvod = doc ? pickLocaleBlocks<any[]>(doc.uvod, locale) : undefined;
  const zavrsni = doc ? pickLocaleBlocks<any[]>(doc.zavrsniTekst, locale) : undefined;
  const timeline = doc?.timeline ?? [];

  return (
    <>
      <PageHero
        kicker={t('pages.klubKicker')}
        title={t('nav.oKlubu')}
        subtitle={t('klub.subtitle')}
        breadcrumb={[{ label: t('nav.pocetna'), href: '/' }, { label: t('nav.klub') }]}
        ghost="1995"
      />

      {uvod && uvod.length > 0 && (
        <div className="container-x max-w-3xl pt-14">
          <PortableText value={uvod} />
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="container-x py-14">
          <EmptyState title={t('klub.empty')} subtitle={t('klub.emptySub')} icon="ball" />
        </div>
      ) : (
        <div className="container-x py-14">
          <div className="relative">
            {/* Vertical line: left on mobile, centered on desktop */}
            <div className="absolute left-4 md:left-1/2 top-1 bottom-0 w-px bg-line md:-translate-x-1/2" aria-hidden />
            <ol className="list-none m-0 p-0">
              {timeline.map((it, i) => (
                <TimelineItem key={it._key ?? i} item={it} locale={locale} flip={i % 2 === 1} />
              ))}
            </ol>
          </div>
        </div>
      )}

      {zavrsni && zavrsni.length > 0 && (
        <div className="container-x max-w-3xl pb-14">
          <PortableText value={zavrsni} />
        </div>
      )}

      {/* CTA: people behind the club + join */}
      <div className="container-x pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden bg-ink-800 p-8 md:p-10">
            <span className="absolute -right-4 -bottom-6 font-display font-extrabold italic text-white/[.04] text-[110px] leading-none select-none" aria-hidden>
              KLUB
            </span>
            <h2 className="h-display text-white text-2xl md:text-3xl leading-tight max-w-sm">
              {t('klub.ctaUpravaTitle')}
            </h2>
            <Link href="/uprava" className="btn-ghost inline-flex mt-7 px-6 py-3">
              {t('klub.ctaUpravaBtn')}
            </Link>
          </div>
          <div className="relative overflow-hidden bg-croatia p-8 md:p-10">
            <span className="absolute -right-4 -bottom-6 font-display font-extrabold italic text-white/[.08] text-[110px] leading-none select-none" aria-hidden>
              1995
            </span>
            <h2 className="h-display text-white text-2xl md:text-3xl leading-tight max-w-sm">
              {t('klub.ctaClanTitle')}
            </h2>
            <Link
              href="/postani-clan"
              className="inline-block mt-7 bg-white text-croatia font-display font-bold uppercase text-sm tracking-wider2 px-6 py-3 hover:bg-paper transition-colors"
            >
              {t('klub.ctaClanBtn')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function TimelineItem({ item, locale, flip }: { item: TimelineStavka; locale: string; flip: boolean }) {
  const label = pickLocale(item.godinaLabela, locale) || String(item.godina);
  const naslov = pickLocale(item.naslov, locale);
  const tekst = pickLocale(item.tekst, locale);

  return (
    <li className="relative pb-12 last:pb-0 md:grid md:grid-cols-2 md:gap-x-20">
      {/* Dot on the line */}
      <span
        className="absolute left-4 md:left-1/2 top-[10px] w-3 h-3 -translate-x-1/2 rotate-45 bg-croatia"
        aria-hidden
      />
      <div className={`pl-12 md:pl-0 ${flip ? 'md:col-start-2 md:pl-14' : 'md:col-start-1 md:pr-14 md:text-right'}`}>
        <div className="font-display font-extrabold italic text-croatia leading-none text-4xl md:text-5xl uppercase">
          {label}
        </div>
        <h3 className="h-display text-content text-xl md:text-2xl mt-3">{naslov}</h3>
        <p className="font-sans text-content-soft leading-relaxed mt-3 whitespace-pre-line">{tekst}</p>
        {item.slika?.asset && (
          <div className="relative aspect-[16/9] mt-5 overflow-hidden border border-line bg-paper">
            <Image
              src={urlFor(item.slika).width(1200).fit('max').auto('format').url()}
              alt={naslov}
              fill
              sizes="(max-width:768px) 90vw, 45vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </li>
  );
}
