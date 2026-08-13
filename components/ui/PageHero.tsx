export function PageHero({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative bg-ink-700 border-b border-slateblue-900 overflow-hidden">
      <div className="sahovnica-strip" />
      {/* subtle diagonal accent */}
      <div
        aria-hidden
        className="absolute -right-24 -top-10 w-[420px] h-[420px] rounded-full opacity-[.06]"
        style={{ background: 'radial-gradient(circle,#D8232F 0%,transparent 60%)' }}
      />
      <div className="container-x py-14 md:py-20 relative">
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
    </section>
  );
}
