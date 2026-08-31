'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, klubSubItems, site } from '@/lib/site';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { SocialIcon } from './SocialIcon';

/* Muotathal 2024 group photo (the same asset as the /postani-clan page
   header) — the Klub panel's join card. Served straight from the Sanity CDN. */
const JOIN_CARD_PHOTO =
  'https://cdn.sanity.io/images/jxoy4fyb/production/c8934db4bb127954e687281191ce38aba6df9ad7-1778x1200.webp';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

/** "Klub" mega-panel: two columns (links with one-line descriptions + a join
 *  CTA card). Opens on hover AND on focus/Enter; Escape closes and returns
 *  focus to the trigger; ArrowUp/Down walk the panel links; a 120ms grace
 *  period keeps it open on a diagonal mouse path. */
function KlubMenu({ linkCls }: { linkCls: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => cancelClose, []);

  const items = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a') ?? []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    const list = items();
    const idx = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        openNow();
        requestAnimationFrame(() => items()[0]?.focus());
        return;
      }
      (list[idx + 1] ?? list[0])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return;
      (idx <= 0 ? list[list.length - 1] : list[idx - 1])?.focus();
    } else if (
      (e.key === 'Enter' || e.key === ' ') &&
      document.activeElement === triggerRef.current
    ) {
      // Enter on the trigger opens the panel (focus already opened it, so
      // this moves focus to the first row) instead of navigating — the
      // panel's first row (O klubu) still leads to /klub.
      e.preventDefault();
      openNow();
      requestAnimationFrame(() => items()[0]?.focus());
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocusCapture={(e) => {
        // Open only when focus ENTERS from outside — the internal focus
        // return after Escape must not re-open the panel.
        if (wrapRef.current?.contains(e.relatedTarget as Node)) return;
        openNow();
      }}
      onBlurCapture={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={onKeyDown}
    >
      <Link
        ref={triggerRef}
        href="/klub"
        className={linkCls}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {t('nav.klub')}
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
          className={`mt-px transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Link>

      {/* pt-4 pushes the visible box below the crest's 16px overhang (no
          overlap with the crest) while the transparent strip keeps the hover
          path connected. z-40 stays above the crest (z-30) but inside the
          fixed header, so it can never cover the header itself. */}
      <div
        ref={panelRef}
        role="group"
        aria-label={t('nav.klub')}
        className={`absolute left-0 top-full z-40 w-[640px] pt-4 transition-all duration-150 ${
          open
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-1 pointer-events-none invisible'
        }`}
      >
        <div className="bg-ink-700 border border-slateblue-900 shadow-2xl">
          <div className="h-[3px] bg-croatia" aria-hidden />
          <div className="grid grid-cols-[1.35fr_1fr] gap-3 p-3">
            <div>
              {klubSubItems.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className="group/row block px-4 py-3 transition-colors hover:bg-ink-600"
                >
                  <span
                    className={`block font-display font-bold text-[15px] tracking-[.07em] uppercase transition-colors ${
                      isActive(pathname, s.href)
                        ? 'text-croatia'
                        : 'text-white group-hover/row:text-croatia'
                    }`}
                  >
                    {t(`nav.${s.id}`)}
                  </span>
                  <span className="block font-sans text-xs text-slateblue-400 mt-0.5">
                    {t(`klubMenu.${s.id}Desc`)}
                  </span>
                </Link>
              ))}
            </div>

            {/* CTA card — a photo header instead of a tiny crest: the circular
                lettering is unreadable below ~80px, and the full-size crest
                already sits in the same bar a few pixels up. */}
            <div className="bg-ink-600 border border-slateblue-900 flex flex-col overflow-hidden">
              <div className="relative w-full aspect-[16/9]">
                <Image src={JOIN_CARD_PHOTO} alt="" fill sizes="240px" className="object-cover" />
              </div>
              <div className="p-5 pt-4 flex flex-col items-start">
                <div className="font-display font-extrabold italic uppercase text-white text-lg leading-tight">
                  {t('klubMenu.ctaTitle')}
                </div>
                <p className="font-sans text-xs text-slateblue-300 leading-relaxed mt-1.5">
                  {t('klubMenu.ctaText')}
                </p>
                <Link href="/postani-clan" className="btn-cta px-4 py-2 mt-4">
                  <span className="text-[12px]">{t('header.join')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const rightItems: { id: string; href: string }[] = [...navItems.slice(3)];

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
      return <KlubMenu key={item.id} linkCls={linkCls} />;
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
          <LanguageSwitcher />
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
                scrolled ? 'top-0 w-[88px] h-[88px]' : 'top-[-26px] w-[126px] h-[126px]'
              }`}
            >
              <Logo
                variant="mark"
                fluid
                imgClassName={`transition-[filter] duration-200 ease-out ${
                  scrolled
                    ? 'drop-shadow-[0_2px_5px_rgba(0,0,0,.25)]'
                    : 'drop-shadow-[0_3px_8px_rgba(0,0,0,.28)]'
                }`}
              />
            </div>
          </div>
          <div className="flex justify-end items-center -mr-[13px] h-[84px]">
            {rightItems.map(renderItem)}
            {/* SHOP reads as its own action, not a seventh nav item: hairline
                divider + bag icon. Lives in the MAIN bar so it stays visible
                when the top bar collapses on scroll. */}
            <span className="h-5 w-px bg-slateblue-700 ml-3 mr-2 shrink-0" aria-hidden />
            <Link
              href="/shop"
              className={`flex items-center gap-2 h-[84px] px-[13px] font-display font-bold text-[15px] tracking-[.08em] uppercase whitespace-nowrap border-t-[3px] border-t-transparent transition-colors ${
                isActive(pathname, '/shop')
                  ? 'text-white border-b-[3px] border-b-croatia'
                  : 'text-slateblue-50 border-b-[3px] border-b-transparent hover:text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 8h12l-1 12H7L6 8z" />
                <path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
              {t('nav.shop')}
            </Link>
          </div>
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
