'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, klubSubItems, site } from '@/lib/site';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40">
      {/* Top contact bar — desktop only */}
      <div className="hidden lg:flex bg-ink-900 h-[34px] items-center justify-between px-10 font-sans font-medium text-xs text-slateblue-400 tracking-[.02em]">
        <div className="flex items-center gap-[18px]">
          <a href={site.phoneHref} className="hover:text-white transition-colors">
            {site.phone}
          </a>
          <span className="text-slateblue-600">•</span>
          <a href={`mailto:${site.email}`} className="hover:text-white transition-colors">
            {site.email}
          </a>
        </div>
        <div className="flex gap-[18px]">
          <a href={site.social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
          <a href={site.social.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
        </div>
      </div>

      {/* Main bar — desktop */}
      <div className="hidden lg:flex bg-ink-700 h-[84px] items-center px-10 gap-7">
        <Logo size={48} />
        <nav className="flex h-[84px]" aria-label="Glavna navigacija">
          {navItems.map((item) => {
            const active =
              item.id === 'klub'
                ? klubSubItems.some((s) => isActive(pathname, s.href))
                : isActive(pathname, item.href);
            const linkCls = `flex items-center gap-1.5 h-[84px] px-[11px] font-display font-bold text-[15px] tracking-[.08em] uppercase whitespace-nowrap border-t-[3px] border-t-transparent transition-colors ${
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
                  {/* Dropdown: opens on hover and on keyboard focus */}
                  <div className="absolute left-0 top-full min-w-[220px] bg-ink-700 border border-slateblue-900 shadow-2xl opacity-0 -translate-y-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto">
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
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <LanguageSwitcher />
          <Link href="/shop" className="btn-cta-outline px-5 py-3">
            <span>{t('nav.shop')}</span>
          </Link>
          <Link href="/postani-clan" className="btn-cta px-5 py-3">
            <span>{t('header.join')}</span>
          </Link>
        </div>
      </div>

      {/* Mobile bar */}
      <div className="lg:hidden bg-ink-700 h-16 flex items-center justify-between px-4">
        <Logo size={38} />
        <div className="flex items-center gap-3">
          <LanguageSwitcher size="sm" />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
