import { Link } from '@/i18n/navigation';

/**
 * THE card of the site — every card everywhere renders through this one
 * component, so restyling happens in exactly one place.
 *
 * Base (all variants): sharp corners, shadow instead of border (the values
 * from the home news section).
 *
 * - `content`: content cards with a photo (news, events, galleries, teams).
 *   Adds the 45° bottom-right corner cut (same angle as the sahovnica
 *   diagonal) and the full hover: 4px lift + stronger shadow; pair with
 *   `cardImage` (4% zoom / 700ms) and `cardTitle` (title turns red).
 * - `plain`: small commercial/utility cards (shop, sponsor logos). Same
 *   hover, no corner cut.
 * - `static`: non-interactive surfaces (stats, board, info/form panels).
 *   No hover at all.
 *
 * `tone="dark"` swaps the surface for navy sections (keeps a hairline
 * border for definition, since shadows don't read on dark backgrounds).
 * Pass `href` to render a Link, otherwise a div. `shadow={false}` lets a
 * caller supply its own shadow (e.g. the hero-overlap stats strip).
 */

export const cardImage =
  'object-cover transition-transform duration-700 group-hover:scale-[1.04]';

export const cardTitle = 'group-hover:text-croatia transition-colors';

const BASE_SHADOW = 'shadow-[0_2px_10px_rgba(19,31,51,.06)]';
const HOVER =
  'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(19,31,51,.13)]';

type CardProps = {
  variant?: 'content' | 'plain' | 'static';
  /** `dark` adds a hairline border for definition on navy sections;
   *  `darkPlain` is the bare navy surface (caller brings its own border). */
  tone?: 'light' | 'dark' | 'darkPlain';
  /** Corner-cut size for the content variant. */
  cut?: 'sm' | 'lg';
  href?: string;
  shadow?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Card({
  variant = 'static',
  tone = 'light',
  cut = 'sm',
  href,
  shadow = true,
  className = '',
  children,
}: CardProps) {
  const surface =
    tone === 'dark'
      ? 'bg-ink-550 border border-slateblue-700'
      : tone === 'darkPlain'
        ? 'bg-ink-550'
        : 'bg-white';
  const cls = [
    'relative',
    surface,
    shadow ? BASE_SHADOW : '',
    variant === 'content'
      ? cut === 'lg'
        ? 'corner-cut [--cut:26px] md:[--cut:34px]'
        : 'corner-cut [--cut:22px] md:[--cut:26px]'
      : '',
    variant !== 'static' ? `group ${HOVER}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}
