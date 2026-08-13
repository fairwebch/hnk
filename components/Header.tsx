'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { navItems, site } from '@/lib/site';
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
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center h-[84px] px-[11px] font-display font-bold text-[15px] tracking-[.08em] uppercase whitespace-nowrap border-t-[3px] border-t-transparent transition-colors ${
                  active
                    ? 'text-white border-b-[3px] border-b-croatia'
                    : 'text-slateblue-50 border-b-[3px] border-b-transparent hover:text-white'
                }`}
              >
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
