import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import {
  latestNovostiQuery,
  nextDogadjajQuery,
  allMomcadiQuery,
  sponzoriQuery,
  galerijeTeaserQuery,
  homeCountsQuery,
  postavkeSajtaQuery,
} from '@/sanity/lib/queries';
import type { Novost, Dogadjaj, Momcad, Sponzor } from '@/sanity/lib/types';
import { NewsHighlights } from '@/components/NewsHighlights';
import { Card, cardImage } from '@/components/ui/Card';
import { EventCountdown } from '@/components/EventCountdown';
import { HeroBackdrop } from '@/components/HeroBackdrop';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { SanityImage } from '@/components/ui/SanityImage';
import { ShopSlider } from '@/components/shop/ShopSlider';
import { shopProducts } from '@/lib/shop';
import { urlFor } from '@/sanity/lib/image';
import { pickLocale, formatDate } from '@/lib/locale';
import { site } from '@/lib/site';

type GalleryTeaser = {
  _id: string;
  name: { hr?: string; de?: string };
  slug: string;
  cover?: any;
  count?: number;
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [news, nextEvent, teams, sponsors, galleries, counts, postavke] =
    await Promise.all([
      sanityFetch<Novost[]>(latestNovostiQuery, { limit: 5 }, []),
      sanityFetch<Dogadjaj | null>(nextDogadjajQuery, {}, null),
      sanityFetch<Momcad[]>(allMomcadiQuery, {}, []),
      sanityFetch<Sponzor[]>(sponzoriQuery, {}, []),
      sanityFetch<GalleryTeaser[]>(galerijeTeaserQuery, { limit: 4 }, []),
      sanityFetch<{ novosti: number; momcadi: number; galerije: number }>(
        homeCountsQuery,
        {},
        { novosti: 0, momcadi: 0, galerije: 0 },
      ),
      sanityFetch<{ heroSlike?: any[] } | null>(postavkeSajtaQuery, {}, null),
    ]);

  const heroSrcs = (postavke?.heroSlike ?? [])
    .filter((img: any) => img?.asset)
    .slice(0, 3)
    .map((img: any) => urlFor(img).width(2560).auto('format').quality(75).url());

  const years = new Date().getFullYear() - site.founded;
  const stats = [
    { value: String(site.founded), label: t('home.stats.founded') },
    { value: `${years}`, label: t('home.stats.years') },
    { value: counts.momcadi > 0 ? `${counts.momcadi}` : '4', label: t('home.stats.teams') },
    { value: '250+', label: t('home.stats.members') },
  ];

  return (
    <>
      {/* HERO — photo backdrop (from Studio → Postavke sajta), slow crossfade */}
      <section className="relative overflow-hidden bg-ink-700">
        {heroSrcs.length > 0 ? (
          <HeroBackdrop srcs={heroSrcs} />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              background:
                'repeating-conic-gradient(#D8232F 0% 25%, transparent 0% 50%) 0 0 / 60px 60px',
            }}
          />
        )}

        <div className="container-x relative z-10 py-20 md:py-28 pb-28 md:pb-36">
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10 lg:gap-14 items-center">
            <div>
              <h1 className="h-display text-white tracking-[.01em] text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92] max-w-4xl break-words">
                <span className="block">{t('home.heroTitle1')}</span>
                <span className="block text-croatia">{t('home.heroTitle2')}</span>
              </h1>
              <p className="font-sans text-slateblue-100 mt-6 max-w-xl text-lg md:text-xl leading-relaxed">
                {t('home.heroSubtitle')}
              </p>
              <div className="flex flex-wrap gap-4 mt-9">
                <Link href="/postani-clan" className="btn-cta px-6 py-3.5">
                  <span>{t('home.ctaJoin')}</span>
                </Link>
              </div>
            </div>

            {/* Next event card — inside the hero (right on desktop, below on mobile) */}
            {nextEvent && (
              <div className="bg-ink-800/80 backdrop-blur-sm border border-slateblue-700 p-6 md:p-7 max-w-md w-full lg:justify-self-end">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-croatia animate-pulse" />
                  <span className="kicker text-[11px]">{t('home.nextEvent')}</span>
                </div>
                <div className="h-display text-white text-2xl md:text-[1.7rem] leading-none">
                  {pickLocale(nextEvent.name, locale)}
                </div>
                <div className="mt-2.5 font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-300">
                  <span className="text-croatia">
                    {formatDate(nextEvent.datumPocetak, locale, {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  {nextEvent.location && <span> · {nextEvent.location}</span>}
                </div>
                <div className="mt-5">
                  <EventCountdown date={nextEvent.datumPocetak} size="md" />
                </div>
                <Link href={`/dogadjaji/${nextEvent.slug}`} className="btn-cta px-5 py-3 w-fit mt-6">
                  <span>{t('home.eventRegister')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* STATS — white card overlapping the hero */}
      <div className="relative z-10 -mt-16 md:-mt-20">
        <div className="container-x">
          <Card shadow={false} className="shadow-[0_18px_40px_rgba(19,31,51,.12)] grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-line">
            {stats.map((s, i) => (
              <div key={i} className="py-8 md:py-10 px-4 text-center">
                <div className="font-display font-extrabold text-content text-4xl md:text-5xl leading-none">
                  {s.value}
                </div>
                <div className="font-display font-bold uppercase text-[11px] md:text-xs tracking-wider2 text-content-muted mt-2">
                  {s.label}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* LATEST NEWS */}
      <section className="bg-paper">
        <div className="container-x py-16">
          <SectionHeading
            kicker={t('home.newsKicker')}
            title={t('home.newsHeading')}
            href="/novosti"
            linkLabel={t('common.viewAll')}
          />
          {news.length === 0 ? (
            <EmptyState title={t('empty.news')} subtitle={t('empty.newsSub')} icon="ball" />
          ) : (
            <NewsHighlights items={news} locale={locale} />
          )}
        </div>
      </section>

      {/* TEAMS — navy section */}
      {teams.length > 0 && (
        <section className="bg-ink-800">
          <div className="container-x py-16">
            <SectionHeading
              tone="dark"
              kicker={t('home.teamsKicker')}
              title={t('home.teamsHeading')}
              href="/momcadi"
              linkLabel={t('common.viewAll')}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {teams.slice(0, 3).map((team) => {
                const photo = team.grupnaFotografija ?? team.coverImage;
                return (
                <Card
                  key={team._id}
                  variant="content"
                  /* darkPlain when a photo fills the card: the dark tone's 1px
                     slateblue border isn't covered by the inset-0 photo and
                     reads as a light seam along the bottom edge + corner cut. */
                  tone={photo?.asset ? 'darkPlain' : 'dark'}
                  href={`/momcadi/${team.slug}`}
                  className="overflow-hidden flex flex-col justify-end min-h-[220px] p-6"
                >
                  {photo?.asset && (
                    /* The whole media block (photo + gradient) zooms together on
                       hover — zooming only the img lets its bright, ungraded
                       bottom row peek out past the gradient's antialiased edge
                       as a light seam along the card edge and the corner cut. */
                    <div
                      aria-hidden
                      className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
                    >
                      <SanityImage
                        image={photo}
                        alt=""
                        fill
                        sizes="(max-width:768px) 100vw, (max-width:1440px) 33vw, 450px"
                        className="object-cover"
                      />
                      {/* Bottom-up navy gradient: opaque behind the text, gone by
                          mid-card so the upper half of the photo stays untouched. */}
                      <div className="absolute -inset-px bg-gradient-to-t from-ink-550/90 from-0% via-ink-550/60 via-20% to-transparent to-[48%]" />
                    </div>
                  )}
                  <div className="relative">
                    <h3 className="h-display text-white text-2xl leading-none group-hover:text-croatia transition-colors">
                      {pickLocale(team.name, locale)}
                    </h3>
                    <div className="mt-3 font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia">
                      {t('common.learnMore')} →
                    </div>
                  </div>
                </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY TEASER */}
      <section className="bg-white border-t border-line">
        <div className="container-x py-16">
          <SectionHeading
            kicker={t('home.galleryKicker')}
            title={t('home.galleryHeading')}
            href="/galerija"
            linkLabel={t('common.viewAll')}
          />
          {galleries.length === 0 ? (
            <EmptyState title={t('empty.gallery')} subtitle={t('empty.gallerySub')} icon="photo" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleries.map((g) => (
                <Card
                  key={g._id}
                  variant="content"
                  href={`/galerija/${g.slug}`}
                  className="aspect-square overflow-hidden"
                >
                  <SanityImage
                    image={g.cover}
                    alt={pickLocale(g.name, locale)}
                    fill
                    sizes="(max-width:768px) 50vw, 25vw"
                    className={cardImage}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <div className="h-display text-white text-sm leading-tight">
                      {pickLocale(g.name, locale)}
                    </div>
                    {typeof g.count === 'number' && (
                      <div className="font-sans text-[11px] text-slateblue-300 mt-0.5">
                        {t('gallery.photoCount', { count: g.count })}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative overflow-hidden bg-croatia">
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-48 opacity-[0.12] hidden sm:block"
          style={{
            background:
              'repeating-conic-gradient(#FFFFFF 0% 25%, transparent 0% 50%) 0 0 / 24px 24px',
          }}
        />
        <div className="container-x py-14 relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="h-display text-white text-3xl md:text-4xl leading-none">
              {t('home.ctaTitle')}
            </h2>
            <p className="font-sans text-white/85 mt-3 max-w-xl leading-relaxed">
              {t('home.ctaText')}
            </p>
          </div>
          <Link
            href="/postani-clan"
            className="inline-flex items-center bg-white px-7 py-4 w-fit shadow-[0_8px_20px_rgba(0,0,0,.18)] hover:bg-paper transition-colors [transform:skewX(-8deg)]"
          >
            <span className="font-display font-extrabold uppercase tracking-wider2 text-croatia [transform:skewX(8deg)]">
              {t('home.ctaJoin')}
            </span>
          </Link>
        </div>
      </section>

      {/* PARTNERS STRIP */}
      {sponsors.length > 0 && (
        <section className="bg-paper border-t border-line">
          <div className="container-x py-14">
            <div className="text-center mb-10">
              <div className="kicker text-xs mb-2">{t('home.partnersKicker')}</div>
              <h2 className="h-display text-content text-2xl md:text-3xl">
                {t('home.partnersHeading')}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {sponsors.map((s) =>
                s.logo?.asset ? (
                  <Card
                    key={s._id}
                    variant="plain"
                    className="h-24 w-40 flex items-center justify-center p-5"
                  >
                    <Image
                      src={urlFor(s.logo).height(120).fit('max').auto('format').url()}
                      alt={s.name}
                      width={180}
                      height={90}
                      className="max-h-14 w-auto object-contain"
                    />
                  </Card>
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}

      {/* CLUB SHOP */}
      <section className="bg-white border-t border-line">
        <div className="container-x py-16">
          <SectionHeading
            kicker={t('shop.kicker')}
            title={t('shop.title')}
            href="/shop"
            linkLabel={t('shop.viewAll')}
          />
          <ShopSlider products={shopProducts} buyLabel={t('shop.buy')} />
        </div>
      </section>
    </>
  );
}
