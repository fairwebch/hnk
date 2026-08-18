'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, klubSubItems } from '@/lib/site';
import { LanguageSwitcher } from './LanguageSwitcher';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

export function MobileMenu() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [klubOpen, setKlubOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const klubActive = klubSubItems.some((s) => isActive(pathname, s.href));

  // Close on route change; open the accordion when a Klub page is current.
  // The flag tells the history cleanup NOT to call history.back() — that
  // would undo the navigation that just happened.
  const closedByNav = useRef(false);
  useEffect(() => {
    closedByNav.current = true;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) setKlubOpen(klubActive);
  }, [open, klubActive]);

  // iOS-safe scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const b = document.body;
    b.style.position = 'fixed';
    b.style.top = `-${y}px`;
    b.style.left = '0';
    b.style.right = '0';
    b.style.overflow = 'hidden';
    return () => {
      b.style.position = '';
      b.style.top = '';
      b.style.left = '';
      b.style.right = '';
      b.style.overflow = '';
      window.scrollTo(0, y);
    };
  }, [open]);

  // Browser back closes the menu instead of leaving the page.
  const closedByPop = useRef(false);
  useEffect(() => {
    if (!open) return;
    closedByPop.current = false;
    closedByNav.current = false;
    window.history.pushState({ hnkMenu: true }, '');
    const onPop = () => {
      closedByPop.current = true;
      setOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!closedByPop.current && !closedByNav.current) window.history.back();
    };
  }, [open]);

  // Escape + focus trap; focus returns to the hamburger on close.
  useEffect(() => {
    if (!open) {
      burgerRef.current?.focus();
      return;
    }
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const list = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [],
        );
        if (!list.length) return;
        const cur = document.activeElement as HTMLElement;
        let i = list.indexOf(cur);
        i = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 ? 0 : i + 1);
        list[i].focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const mainItem =
    'flex items-center justify-between min-h-[52px] px-1 font-display font-extrabold italic uppercase text-[26px] leading-none tracking-[.04em] transition-colors';
  const marker = <span className="w-2 h-2 rotate-45 bg-croatia shrink-0" aria-hidden />;

  return (
    <>
      {/* Hamburger */}
      <button
        ref={burgerRef}
        type="button"
        aria-label={t('header.openMenu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex flex-col gap-1 p-2"
        style={{ touchAction: 'manipulation' }}
      >
        <span className="block w-5 h-[2px] bg-white" />
        <span className="block w-5 h-[2px] bg-white" />
        <span className="block w-[14px] h-[2px] bg-croatia" />
      </button>

      {/* Full-screen overlay: fade + slight slide from top */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('header.openMenu')}
        className={`fixed inset-0 z-50 bg-ink-900 outline-none transition-all duration-200 ease-out lg:hidden ${
          open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-3'
        }`}
        onClick={(e) => {
          // Tap on the empty backdrop (not on a link/button) closes.
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {/* Top bar: brand + X where the hamburger was */}
        <div
          className="flex items-center justify-between h-16 px-4 border-b border-slateblue-900"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <span className="font-display font-extrabold italic text-white tracking-[.03em]">
            HNK KROATIEN SCHWYZ
          </span>
          <button
            type="button"
            aria-label={t('header.closeMenu')}
            onClick={() => setOpen(false)}
            className="relative w-12 h-12 -mr-2 text-white"
            style={{ touchAction: 'manipulation' }}
          >
            <span className="absolute left-1/2 top-1/2 w-6 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
            <span className="absolute left-1/2 top-1/2 w-6 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 -rotate-45" />
          </button>
        </div>

        {/* Scrollable items */}
        <nav
          aria-label="Mobilna navigacija"
          className="absolute left-0 right-0 overflow-y-auto px-6"
          style={{
            top: 'calc(64px + env(safe-area-inset-top))',
            bottom: 'calc(150px + env(safe-area-inset-bottom))',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="py-4 flex flex-col">
            {navItems.map((item) => {
              if (item.id === 'klub') {
                return (
                  <div key={item.id} className="border-b border-slateblue-900">
                    <button
                      type="button"
                      aria-expanded={klubOpen}
                      onClick={() => setKlubOpen((v) => !v)}
                      className={`${mainItem} w-full text-left ${
                        klubActive ? 'text-white' : 'text-slateblue-50'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="flex items-center gap-3">
                        {klubActive && marker}
                        {t('nav.klub')}
                      </span>
                      <svg
                        viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden
                        className={`transition-transform duration-200 ${klubOpen ? 'rotate-180 text-croatia' : 'text-slateblue-400'}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {/* Animated accordion (grid-rows trick) */}
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        klubOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pb-3 flex flex-col">
                          {klubSubItems.map((s) => (
                            <Link
                              key={s.id}
                              href={s.href}
                              className={`flex items-center gap-3 min-h-[48px] pl-6 font-display font-bold uppercase text-lg tracking-[.06em] transition-colors ${
                                isActive(pathname, s.href)
                                  ? 'text-croatia'
                                  : 'text-slateblue-200 hover:text-white'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rotate-45 shrink-0 ${
                                  isActive(pathname, s.href) ? 'bg-croatia' : 'bg-slateblue-700'
                                }`}
                                aria-hidden
                              />
                              {t(`nav.${s.id}`)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`${mainItem} border-b border-slateblue-900 ${
                    active ? 'text-white' : 'text-slateblue-50 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {active && marker}
                    {t(`nav.${item.id}`)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Fixed bottom: language + CTAs */}
        <div
          className="absolute left-0 right-0 bottom-0 border-t border-slateblue-900 bg-ink-900 px-6 pt-4"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex justify-center mb-4">
            <LanguageSwitcher />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/postani-clan" className="btn-cta justify-center px-4 py-3.5">
              <span>{t('header.join')}</span>
            </Link>
            <Link href="/shop" className="btn-cta-outline justify-center px-4 py-3.5">
              <span>{t('nav.shop')}</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
