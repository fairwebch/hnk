'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, klubSubItems, site } from '@/lib/site';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { SocialIcon } from './SocialIcon';

/** Variant switch: true = SHOP as a regular nav item on the right (3-4),
 *  false = 3-3 symmetry around the crest, shop lives in footer + mobile bar. */
const SHOP_IN_NAV = false;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();

  const socials = [
    { label: 'Facebook', icon: 'facebook' as const, href: site.social.facebook },
    { label: 'Instagram', icon: 'instagram' as const, href: site.social.instagram },
    { label: 'WhatsApp', icon: 'whatsapp' as const, href: site.social.whatsapp },
  ];

  const leftItems: { id: string; href: string }[] = [...navItems.slice(0, 3)];
  const rightItems: { id: string; href: string }[] = SHOP_IN_NAV
    ? [...navItems.slice(3, 5), { id: 'shop', href: '/shop' }, ...navItems.slice(5)]
    : [...navItems.slice(3)];

  function renderItem(item: { id: string; href: string }) {
    const active =
      item.id === 'klub'
        ? klubSubItems.some((s) => isActive(pathname, s.href))
        : isActive(pathname, item.href);
    const linkCls = `flex items-center gap-1.5 h-[84px] px-[13px] font-display font-bold text-[15px] tracking-[.08em] uppercase whitespace-nowrap border-t-[3px] border-t-transparent transition-colors ${
      active
        ? 'text-white border-b-[3px] border-b-croatia'
        : 'text-slateblue-50 border-b-[3px] border-b-transparent hover:text-white'
    }`;

    if (item.id === 'klub') {
      return (
        <div key={item.id} className="relative group">
          <Link href={item.href} className={linkCls} aria-haspopup="true">
            {t(`nav.${item.id}`)}
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className="mt-px transition-transform group-hover:rotate-180"><path d="M6 9l6 6 6-6" /></svg>
          </Link>
          {/* Dropdown: opens on hover and on keyboard focus. z-20 keeps it
              above the overhanging crest (z-10), which its top-right corner
              can reach under. */}
          <div className="absolute left-0 top-full z-20 min-w-[220px] bg-ink-700 border border-slateblue-900 shadow-2xl opacity-0 -translate-y-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
            <div className="h-[3px] bg-croatia" aria-hidden />
            {klubSubItems.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={`block px-5 py-3 font-display font-bold text-[14px] tracking-[.07em] uppercase border-b border-slateblue-900 last:border-b-0 transition-colors ${
                  isActive(pathname, s.href) ? 'text-croatia' : 'text-slateblue-50 hover:text-white hover:bg-ink-600'
                }`}
              >
                {t(`nav.${s.id}`)}
              </Link>
            ))}
          </div>
        </div>
      );
    }

    return (
      <Link key={item.id} href={item.href} className={linkCls}>
        {t(`nav.${item.id}`)}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Top bar — desktop only: socials left, language + join CTA right. */}
      <div className="hidden lg:flex bg-ink-900 h-11 items-center justify-between px-10">
        <div className="flex items-center gap-1">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="inline-flex items-center justify-center w-8 h-8 text-slateblue-400 hover:text-white transition-colors"
            >
              <SocialIcon name={s.icon} size={15} />
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/postani-clan" className="btn-cta px-4 py-[6px]">
            <span className="text-[12px]">{t('header.join')}</span>
          </Link>
        </div>
      </div>

      {/* Main bar — desktop: 3-3 nav around the centered crest. The crest is
          bigger than the bar and overhangs its bottom edge (round, so it
          holds up), exactly the FCZ treatment. */}
      <div className="hidden lg:block bg-ink-700 relative">
        <nav
          aria-label="Glavna navigacija"
          className="grid grid-cols-[1fr_auto_1fr] items-center h-[84px] px-10"
        >
          <div className="flex justify-end h-[84px]">{leftItems.map(renderItem)}</div>
          {/* Center track: the crest lives HERE in the DOM (between the two
              nav halves) so tab/reading order matches the visual order; only
              the overhang below the bar is done with absolute positioning. */}
          <div className="relative w-[136px] h-[84px]">
            <div className="absolute left-1/2 -translate-x-1/2 top-[5px] z-10">
              <Logo
                variant="mark"
                size={100}
                className="drop-shadow-[0_8px_18px_rgba(0,0,0,.4)]"
              />
            </div>
          </div>
          <div className="flex justify-start h-[84px]">{rightItems.map(renderItem)}</div>
        </nav>
      </div>

      {/* Mobile bar — shop left, crest centered (inside MobileMenu so the
          crest and the burger/X are the SAME elements whether the menu is
          open or closed; nothing can jump). */}
      <div className="lg:hidden bg-ink-700 h-16 flex items-center justify-between px-4 relative">
        <MobileMenu />
      </div>
    </header>
  );
}
