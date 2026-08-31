import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { upravaQuery } from '@/sanity/lib/queries';
import type { ClanUprave } from '@/sanity/lib/types';
import { PageHero } from '@/components/ui/PageHero';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { SanityImage } from '@/components/ui/SanityImage';
import { pickLocale } from '@/lib/locale';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'board' });
  return { title: t('title') };
}

/** Unified photo placeholder: club-navy tile with big italic initials and a
 *  thin red base line. Used for every member without a real portrait, so
 *  illustrations and silhouettes never mix on the page. */
function InitialsTile({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div aria-hidden className="absolute inset-0 bg-ink-700 flex items-center justify-center">
      <span className="font-display font-extrabold italic text-white text-5xl tracking-[.02em]">
        {initials}
      </span>
      <span className="absolute bottom-0 inset-x-0 h-[3px] bg-croatia" />
    </div>
  );
}

function Portrait({ member, sizes }: { member: ClanUprave; sizes: string }) {
  return member.image?.asset ? (
    <SanityImage image={member.image} alt={member.name} fill sizes={sizes} className="object-cover" />
  ) : (
    <InitialsTile name={member.name} />
  );
}

export default async function UpravaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const members = await sanityFetch<ClanUprave[]>(upravaQuery, {}, []);

  // Big -> medium -> small: [0] president band, [1..4] leadership row,
  // the rest the compact board grid (query is ordered by `order`).
  const president = members[0];
  const leadership = members.slice(1, 5);
  const board = members.slice(5);

  return (
    <>
      <PageHero
        kicker={t('board.kicker')}
        title={t('board.title')}
        subtitle={t('board.subtitle', { count: members.length })}
        breadcrumb={[
          { label: t('nav.pocetna'), href: '/' },
          { label: t('nav.klub'), href: '/klub' },
          { label: t('board.title') },
        ]}
        ghost={t('board.ghost')}
      />

      {members.length === 0 ? (
        <div className="container-x py-14">
          <EmptyState title={t('empty.board')} subtitle={t('empty.boardSub')} icon="users" />
        </div>
      ) : (
        <>
          {/* B) President — full-bleed navy band, portrait left / words right */}
          {president && (
            <section className="bg-ink-800">
              <h2 className="sr-only">{pickLocale(president.role, locale)}</h2>
              <div className="container-x py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-14 items-center">
                <div className="relative aspect-[4/5] max-w-[420px] w-full mx-auto lg:mx-0 overflow-hidden">
                  <Portrait member={president} sizes="(max-width:1024px) 90vw, 420px" />
                </div>
                <div>
                  <div className="kicker text-xs">{pickLocale(president.role, locale)}</div>
                  <h3 className="h-display text-white text-4xl md:text-6xl leading-none mt-3">
                    {president.name}
                  </h3>
                  <p className="font-sans text-lg text-slateblue-200 leading-relaxed mt-6 max-w-xl">
                    {t('board.presidentText')}
                  </p>
                  {president.phone && (
                    <a
                      href={`tel:${president.phone.replace(/\s/g, '')}`}
                      className="inline-block font-sans text-sm text-slateblue-300 mt-4 hover:text-white transition-colors"
                    >
                      {president.phone}
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* C) Leadership — one row of four, each with a one-line duty */}
          <section className="bg-paper">
            <div className="container-x py-14">
              <h2 className="h-display text-content text-3xl md:text-4xl mb-8">
                {t('board.leadershipHeading')}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {leadership.map((m) => (
                  <Card key={m._id} className="overflow-hidden">
                    <div className="relative aspect-[4/5] bg-line">
                      <Portrait member={m} sizes="(max-width:768px) 50vw, (max-width:1024px) 45vw, 340px" />
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="font-display font-bold uppercase text-[11px] leading-snug tracking-wider2 text-croatia">
                        {pickLocale(m.role, locale)}
                      </div>
                      <h3 className="h-display text-content text-lg sm:text-xl mt-1">{m.name}</h3>
                      {pickLocale(m.zaduzenje, locale) && (
                        <p className="font-sans text-[13px] text-content-soft leading-snug mt-2">
                          {pickLocale(m.zaduzenje, locale)}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* D) Visual cut — thin dark stat band breaking the card run */}
          <div className="bg-ink-900 py-3.5">
            <p className="container-x text-center font-display font-bold uppercase text-[12px] tracking-wider2 text-slateblue-300">
              {t('board.band', { count: members.length })}
            </p>
          </div>

          {/* E) Board — the remaining eight, compact 4-up grid */}
          <section className="bg-paper">
            <div className="container-x py-14">
              <h2 className="h-display text-content text-3xl md:text-4xl mb-8">
                {t('board.boardHeading')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                {board.map((m) => (
                  <Card key={m._id} className="overflow-hidden">
                    <div className="relative aspect-square bg-line">
                      <Portrait member={m} sizes="(max-width:768px) 50vw, (max-width:1024px) 25vw, 250px" />
                    </div>
                    <div className="p-3.5">
                      <h3 className="h-display text-content text-base leading-tight">{m.name}</h3>
                      <div className="font-sans text-xs text-content-muted mt-1">
                        {pickLocale(m.role, locale)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* F) Closing CTA — the page must not fall straight into the footer */}
          <section className="bg-white border-t border-line">
            <div className="container-x py-14 text-center">
              <h2 className="h-display text-content text-3xl md:text-4xl">
                {t('board.ctaTitle')}
              </h2>
              <p className="font-sans text-content-soft mt-3">{t('board.ctaText')}</p>
              <div className="flex flex-wrap justify-center gap-4 mt-7">
                <Link href="/postani-clan" className="btn-cta px-6 py-3.5">
                  <span>{t('nav.postaniClan')}</span>
                </Link>
                <Link href="/kontakt" className="btn-ghost-light px-6 py-3.5 text-sm">
                  {t('nav.kontakt')}
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
