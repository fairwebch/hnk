'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, site } from '@/lib/site';

export function MobileMenu() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open; close on route change.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Hamburger */}
      <button
        type="button"
        aria-label={t('header.openMenu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex flex-col gap-1 p-2"
      >
        <span className="block w-5 h-[2px] bg-white" />
        <span className="block w-5 h-[2px] bg-white" />
        <span className="block w-[14px] h-[2px] bg-croatia" />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[82%] max-w-[340px] bg-ink-700 border-l border-slateblue-900 shadow-2xl transition-transform lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="sahovnica-strip" />
        <div className="flex items-center justify-between h-16 px-5 border-b border-slateblue-900">
          <span className="font-display font-extrabold italic text-white tracking-[.03em]">
            HNK KROATIEN SCHWYZ
          </span>
          <button
            type="button"
            aria-label={t('header.closeMenu')}
            onClick={() => setOpen(false)}
            className="relative w-8 h-8 text-white"
          >
            <span className="absolute left-1/2 top-1/2 w-5 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 rotate-45" />
            <span className="absolute left-1/2 top-1/2 w-5 h-[2px] bg-white -translate-x-1/2 -translate-y-1/2 -rotate-45" />
          </button>
        </div>

        <nav className="flex flex-col px-5 py-4" aria-label="Mobilna navigacija">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`py-3 font-display font-bold text-lg tracking-[.06em] uppercase border-b border-slateblue-900 transition-colors ${
                  active ? 'text-croatia' : 'text-slateblue-50 hover:text-white'
                }`}
              >
                {t(`nav.${item.id}`)}
              </Link>
            );
          })}
          <Link
            href="/shop"
            className={`py-3 font-display font-bold text-lg tracking-[.06em] uppercase border-b border-slateblue-900 transition-colors ${
              pathname === '/shop' || pathname.startsWith('/shop/')
                ? 'text-croatia'
                : 'text-slateblue-50 hover:text-white'
            }`}
          >
            {t('nav.shop')}
          </Link>
        </nav>

        <div className="px-5 mt-2">
          <Link
            href="/postani-clan"
            className="btn-cta w-full justify-center px-5 py-3"
          >
            <span>{t('header.join')}</span>
          </Link>
        </div>

        <div className="px-5 mt-6 flex flex-col gap-2 text-sm text-slateblue-200">
          <a href={site.phoneHref} className="hover:text-white">{site.phone}</a>
          <a href={`mailto:${site.email}`} className="hover:text-white">{site.email}</a>
          <span className="text-slateblue-400">{site.address}</span>
        </div>
      </aside>
    </>
  );
}
