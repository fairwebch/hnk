import { Link } from '@/i18n/navigation';

export function SectionHeading({
  kicker,
  title,
  href,
  linkLabel,
  tone = 'light',
}: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  tone?: 'light' | 'dark';
}) {
  const titleColor = tone === 'dark' ? 'text-white' : 'text-content';
  const linkColor =
    tone === 'dark'
      ? 'text-slateblue-100 hover:text-white'
      : 'text-content-soft hover:text-croatia';
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        {kicker && <div className="kicker text-xs mb-2">{kicker}</div>}
        <h2 className={`h-display text-3xl md:text-4xl leading-none tracking-[.01em] ${titleColor}`}>
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className={`hidden sm:inline-flex items-center gap-2 font-display font-bold uppercase text-sm tracking-wider2 transition-colors whitespace-nowrap ${linkColor}`}
        >
          {linkLabel}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}
