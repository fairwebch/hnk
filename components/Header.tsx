'use client';

import { useEffect, useState } from 'react';
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

  // Desktop shrink-on-scroll (FCZ behaviour): scrolled hides the top bar and
  // shrinks the crest. Hysteresis (collapse >120, expand <60) plus a fixed
  // header + constant spacer (document height never changes) kill the
  // scroll-anchoring feedback loop that made the bar flicker. State updates
  // are rAF-throttled and only fire on an actual change.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled((cur) => (cur ? y >= 60 : y > 120));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
          {/* Dropdown: opens on hover and on keyboard focus. z-40 keeps it
              above the overhanging crest (z-30) — dropdown rows must win. */}
          <div className="absolute left-0 top-full z-40 min-w-[220px] bg-ink-700 border border-slateblue-900 shadow-2xl opacity-0 -translate-y-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
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
    <>
    {/* Fixed (NOT sticky): a sticky header sits in document flow, so the
        collapsing top bar changed the document height on every toggle and
        scroll anchoring bounced scrollY back across the threshold — an
        infinite flicker loop. Fixed + constant spacer keeps the height
        stable no matter what the header does. */}
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Top bar — desktop only: socials left, language + join CTA right.
          Collapses away on scroll so the sticky header stays slim. */}
      <div
        className={`hidden lg:block bg-ink-900 overflow-hidden transition-all duration-200 ease-out ${
          scrolled ? 'h-0 opacity-0 invisible' : 'h-11 opacity-100'
        }`}
      >
        {/* Background bleeds full width on the outer element; only the
            content is capped to the shell. */}
        <div className="container-x h-11 flex items-center justify-between">
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
      </div>

      {/* Main bar — desktop: 3-3 nav around the centered crest. The crest is
          bigger than the bar and overhangs its bottom edge (round, so it
          holds up), exactly the FCZ treatment. */}
      <div className="hidden lg:block bg-ink-700 relative">
        <nav
          aria-label="Glavna navigacija"
          className="container-x grid grid-cols-[1fr_auto_1fr] items-center h-[84px]"
        >
          {/* Groups spread to the shell edges (FCZ pattern); the negative
              margin cancels the first/last link's inner padding so the item
              TEXT sits exactly on the container edge, aligned with the hero
              and section headings below. */}
          <div className="flex justify-start -ml-[13px] h-[84px]">{leftItems.map(renderItem)}</div>
          {/* Center track: the crest lives HERE in the DOM (between the two
              nav halves) so tab/reading order matches the visual order. The
              wrapper carries an explicit square size — without it the
              absolute box shrink-to-fits to half the track and squashes the
              logo. At the top it pokes 26px up into the top bar and 16px
              down into the hero; on scroll it shrinks into the bar. */}
          <div className="relative w-[160px] h-[84px]">
            {/* The drop-shadow lives on THIS transitioned element so it
                scales down together with the crest — a fixed 18px blur around
                an 88px crest reads as a dark halo and blurs the edge. */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-30 transition-all duration-200 ease-out ${
                scrolled
                  ? 'top-0 w-[88px] h-[88px] drop-shadow-[0_3px_8px_rgba(0,0,0,.35)]'
                  : 'top-[-26px] w-[126px] h-[126px] drop-shadow-[0_8px_18px_rgba(0,0,0,.4)]'
              }`}
            >
              <Logo variant="mark" fluid />
            </div>
          </div>
          <div className="flex justify-end -mr-[13px] h-[84px]">{rightItems.map(renderItem)}</div>
        </nav>
      </div>

      {/* Mobile bar — shop left, crest centered (inside MobileMenu so the
          crest and the burger/X are the SAME elements whether the menu is
          open or closed; nothing can jump). */}
      <div className="lg:hidden bg-ink-700 h-16 flex items-center justify-between px-4 relative">
        <MobileMenu />
      </div>
    </header>
    {/* Constant-height spacer reserving the header's place in the flow —
        does NOT react to the scrolled state (that's the whole point). */}
    <div className="h-16 lg:h-[128px]" aria-hidden />
    </>
  );
}
