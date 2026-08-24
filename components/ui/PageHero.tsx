import { Link } from '@/i18n/navigation';
import { SanityImage } from '@/components/ui/SanityImage';

type Crumb = { label: string; href?: string };

export function PageHero({
  kicker,
  title,
  subtitle,
  breadcrumb,
  ghost,
  image,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  ghost?: string;
  /** Optional photo backdrop (Studio → Postavke sajta). Replaces the ghost
   *  watermark; gets the hero's navy treatment, one notch lighter. */
  image?: any;
}) {
  const hasImage = Boolean(image?.asset);
  return (
    <section className="relative bg-ink-700 overflow-hidden">
      {hasImage && (
        <div aria-hidden className="absolute inset-0">
          <SanityImage
            image={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* softer version of the home-hero wash: readable kicker/title/crumbs */}
          <div className="absolute inset-0 bg-ink-900/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 via-ink-900/50 to-ink-900/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent to-ink-900/35" />
        </div>
      )}
      {/* ghost watermark word — only on photo-less headers */}
      {ghost && !hasImage && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 md:right-8 top-1/2 -translate-y-1/2 font-display font-extrabold italic uppercase text-white/[0.04] text-[80px] md:text-[150px] leading-none select-none whitespace-nowrap"
        >
          {ghost}
        </span>
      )}
      {/* subtle red radial accent */}
      {!hasImage && (
        <div
          aria-hidden
          className="absolute -right-24 -top-10 w-[420px] h-[420px] rounded-full opacity-[.06]"
          style={{ background: 'radial-gradient(circle,#D8232F 0%,transparent 60%)' }}
        />
      )}
      <div className="container-x py-14 md:py-20 relative">
        <div className="flex items-end justify-between gap-6">
          <div>
            {kicker && <div className="kicker text-[13px] mb-3">{kicker}</div>}
            <h1 className="h-display text-white tracking-[.02em] text-4xl md:text-6xl leading-[0.95]">
              {title}
            </h1>
            {subtitle && (
              <p className={`font-sans mt-4 max-w-2xl text-lg ${hasImage ? 'text-slateblue-100' : 'text-slateblue-300'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {breadcrumb && breadcrumb.length > 0 && (
            <nav
              aria-label="breadcrumb"
              className={`hidden md:flex items-center gap-2 font-display font-bold uppercase text-[11px] tracking-wider2 shrink-0 pb-1 ${hasImage ? 'text-slateblue-200' : 'text-slateblue-400'}`}
            >
              {breadcrumb.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-slateblue-600">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white transition-colors">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-slateblue-200">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div className="sahovnica-strip" />
    </section>
  );
}
