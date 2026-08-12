import { Link } from '@/i18n/navigation';

export function SectionHeading({
  kicker,
  title,
  href,
  linkLabel,
}: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        {kicker && <div className="kicker text-xs mb-2">{kicker}</div>}
        <h2 className="font-display font-extrabold text-white uppercase tracking-[.02em] text-3xl md:text-4xl leading-none">
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="hidden sm:inline-flex items-center gap-2 font-display font-bold uppercase text-sm tracking-wider2 text-slateblue-100 hover:text-white transition-colors whitespace-nowrap"
        >
          {linkLabel}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
