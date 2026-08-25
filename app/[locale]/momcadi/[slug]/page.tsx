import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { sanityFetch } from '@/sanity/lib/fetch';
import { client } from '@/sanity/lib/client';
import { sanityConfigured } from '@/sanity/env';
import { momcadBySlugQuery, momcadSlugsQuery } from '@/sanity/lib/queries';
import type { Momcad, Igrac, Pozicija } from '@/sanity/lib/types';
import { SanityImage } from '@/components/ui/SanityImage';
import { Card } from '@/components/ui/Card';
import { PortableText } from '@/components/ui/PortableText';
import { GalleryGrid } from '@/components/Lightbox';
import { pickLocale, pickLocaleBlocks } from '@/lib/locale';
import { toLightbox } from '@/lib/gallery';

const POZICIJE_ORDER: Pozicija[] = ['golman', 'obrana', 'vezni', 'napad'];

export async function generateStaticParams() {
  if (!sanityConfigured) return [];
  try {
    const slugs = await client.fetch<string[]>(momcadSlugsQuery);
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const team = await sanityFetch<Momcad | null>(momcadBySlugQuery, { slug }, null);
  return { title: team ? pickLocale(team.name, locale) : undefined };
}

export default async function MomcadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const team = await sanityFetch<Momcad | null>(momcadBySlugQuery, { slug }, null);
  if (!team) notFound();

  const name = pickLocale(team.name, locale);
  const desc = pickLocaleBlocks(team.description, locale);
  const gallery = toLightbox(team.gallery, name);
  const heroImg = team.coverImage?.asset ? team.coverImage : team.grupnaFotografija;
  const igraci = team.igraci ?? [];
  const rosterMode = igraci.length > 0;
  const liga = pickLocale(team.liga, locale);
  const termin = pickLocale(team.terminTreninga, locale);

  return (
    <article>
      {/* Hero */}
      <section className="relative bg-ink-700 border-b border-slateblue-900">
        {heroImg?.asset && (
          <div className="absolute inset-0">
            <SanityImage image={heroImg} alt="" fill sizes="100vw" className="object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/70 to-transparent" />
          </div>
        )}
        <div className="container-x relative py-16 md:py-24">
          <Link
            href="/momcadi"
            className="inline-flex items-center gap-2 font-display font-bold uppercase text-xs tracking-wider2 text-slateblue-300 hover:text-white transition-colors"
          >
            <span aria-hidden>←</span> {t('teams.title')}
          </Link>
          <h1 className="h-display text-white text-5xl md:text-7xl leading-none mt-5">{name}</h1>
          {(liga || termin) && (
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-6">
              {liga && <HeroMeta label={t('teams.liga')} value={liga} />}
              {termin && <HeroMeta label={t('teams.termin')} value={termin} />}
            </div>
          )}
        </div>
      </section>

      {/* Group photo — the hero element of both modes */}
      {team.grupnaFotografija?.asset && (
        <div className="container-x pt-12">
          <div className="relative aspect-[16/9] overflow-hidden border border-line bg-paper">
            <SanityImage
              image={team.grupnaFotografija}
              alt={name}
              fill
              sizes="(max-width:1200px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {rosterMode ? (
        <Roster igraci={igraci} t={t} />
      ) : (
        /* Name rows from the old site, styled as chips */
        team.popisImena && team.popisImena.length > 0 && (
          <div className="container-x pt-10 space-y-8">
            {team.popisImena.map((r, i) => (
              <div key={r._key ?? i}>
                <div className="kicker text-xs mb-3">{pickLocale(r.oznakaReda, locale)}</div>
                <div className="flex flex-wrap gap-2.5">
                  {(r.imena ?? '')
                    .split(',')
                    .map((n) => n.trim())
                    .filter(Boolean)
                    .map((n, j) => (
                      <span
                        key={j}
                        className="border border-line bg-white px-4 py-2 font-display font-bold uppercase text-sm tracking-wider2 text-content"
                      >
                        {n}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Trainer */}
      {team.trener?.ime && (
        <div className="container-x pt-10">
          <div className="inline-flex items-center gap-5 bg-ink-800 p-5 pr-8">
            {team.trener.slika?.asset ? (
              <div className="relative w-16 h-16 overflow-hidden">
                <SanityImage image={team.trener.slika} alt={team.trener.ime} fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <Initials name={team.trener.ime} dark />
            )}
            <div>
              <div className="kicker text-[11px] mb-1">
                {pickLocale(team.trener.funkcija, locale) || t('teams.trener')}
              </div>
              <div className="h-display text-white text-xl leading-none">{team.trener.ime}</div>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {desc && desc.length > 0 && (
        <div className="container-x max-w-3xl py-12">
          <PortableText value={desc} />
        </div>
      )}

      {gallery.length > 0 && (
        <div className="container-x py-14">
          <h2 className="h-display text-content text-2xl tracking-[.02em] mb-6">{t('teams.gallery')}</h2>
          <GalleryGrid images={gallery} />
        </div>
      )}

      {(!desc || desc.length === 0) && gallery.length === 0 && <div className="pb-16" />}
    </article>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="kicker text-[11px] mb-1">{label}</div>
      <div className="font-display font-bold uppercase text-white text-sm tracking-wider2">{value}</div>
    </div>
  );
}

function Initials({ name, dark = false }: { name: string; dark?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={`w-16 h-16 flex items-center justify-center font-display font-extrabold italic text-xl ${
        dark ? 'bg-ink-600 text-slateblue-300' : 'bg-paper text-content-muted'
      }`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function Roster({ igraci, t }: { igraci: Igrac[]; t: any }) {
  const groups: { key: string; label: string; players: Igrac[] }[] = [];
  const withPos = igraci.some((p) => p.pozicija);
  if (withPos) {
    for (const pos of POZICIJE_ORDER) {
      const players = igraci.filter((p) => p.pozicija === pos);
      if (players.length) groups.push({ key: pos, label: t(`teams.pozicije.${pos}`), players });
    }
    const rest = igraci.filter((p) => !p.pozicija);
    if (rest.length) groups.push({ key: 'ostali', label: t('teams.pozicije.ostali'), players: rest });
  } else {
    groups.push({ key: 'svi', label: t('teams.pozicije.ostali'), players: igraci });
  }

  return (
    <div className="container-x pt-10 space-y-10">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="flex items-center gap-4 mb-5">
            <h2 className="kicker text-xs">{g.label}</h2>
            <div className="flex-1 border-t border-line" aria-hidden />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {g.players.map((p, i) => (
              <Card key={p._key ?? i} className="overflow-hidden">
                <div className="relative aspect-[4/5] bg-paper">
                  {p.slika?.asset ? (
                    <SanityImage image={p.slika} alt={`${p.ime} ${p.prezime ?? ''}`} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover" />
                  ) : (
                    <PlayerSilhouette />
                  )}
                  {typeof p.broj === 'number' && (
                    <span className="absolute top-2 right-3 font-display font-extrabold italic text-croatia text-4xl leading-none drop-shadow-sm">
                      {p.broj}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {p.pozicija && (
                    <div className="kicker text-[10px] mb-1">{t(`teams.pozicije.${p.pozicija}`)}</div>
                  )}
                  <div className="h-display text-content text-lg leading-tight">
                    {p.ime}
                    {p.prezime && <> {p.prezime}</>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlayerSilhouette() {
  return (
    <div className="absolute inset-0 flex items-end justify-center" aria-hidden>
      <svg viewBox="0 0 24 24" className="w-3/5 h-3/5 text-line" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
      </svg>
    </div>
  );
}
