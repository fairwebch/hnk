import { Link } from '@/i18n/navigation';

type Crumb = { label: string; href?: string };

export function PageHero({
  kicker,
  title,
  subtitle,
  breadcrumb,
  ghost,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: Crumb[];
  ghost?: string;
}) {
  return (
    <section className="relative bg-ink-700 overflow-hidden">
      {/* ghost watermark word */}
      {ghost && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 md:right-8 top-1/2 -translate-y-1/2 font-display font-extrabold italic uppercase text-white/[0.04] text-[80px] md:text-[150px] leading-none select-none whitespace-nowrap"
        >
          {ghost}
        </span>
      )}
      {/* subtle red radial accent */}
      <div
        aria-hidden
        className="absolute -right-24 -top-10 w-[420px] h-[420px] rounded-full opacity-[.06]"
        style={{ background: 'radial-gradient(circle,#D8232F 0%,transparent 60%)' }}
      />
      <div className="container-x py-14 md:py-20 relative">
        <div className="flex items-end justify-between gap-6">
          <div>
            {kicker && <div className="kicker text-[13px] mb-3">{kicker}</div>}
            <h1 className="h-display text-white tracking-[.02em] text-4xl md:text-6xl leading-[0.95]">
              {title}
            </h1>
            {subtitle && (
              <p className="font-sans text-slateblue-300 mt-4 max-w-2xl text-lg">
                {subtitle}
              </p>
            )}
          </div>
          {breadcrumb && breadcrumb.length > 0 && (
            <nav
              aria-label="breadcrumb"
              className="hidden md:flex items-center gap-2 font-display font-bold uppercase text-[11px] tracking-wider2 text-slateblue-400 shrink-0 pb-1"
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
