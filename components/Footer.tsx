import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { site } from '@/lib/site';
import { NewsletterForm } from '@/components/NewsletterForm';
import { SocialIcon } from '@/components/SocialIcon';
import { CookieSettingsLink } from '@/components/CookieSettingsLink';

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const socials = [
    { label: 'FACEBOOK', icon: 'facebook' as const, href: site.social.facebook },
    { label: 'INSTAGRAM', icon: 'instagram' as const, href: site.social.instagram },
    { label: 'WHATSAPP', icon: 'whatsapp' as const, href: site.social.whatsapp },
  ];
  const clubLinks = [
    { label: t('nav.oKlubu'), href: '/klub' },
    { label: t('footer.links.uprava'), href: '/uprava' },
    { label: t('nav.momcadi'), href: '/momcadi' },
    { label: t('nav.shop'), href: '/shop' },
    { label: t('footer.links.postaniClan'), href: '/postani-clan' },
  ];

  return (
    <footer className="bg-ink-800">
      <div className="sahovnica-strip" />

      {/* Newsletter band */}
      <div className="border-b border-slateblue-900">
        <div className="container-wide py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="kicker text-xs mb-2">{t('newsletter.kicker')}</div>
            <h2 className="h-display text-white text-2xl md:text-3xl leading-none">
              {t('newsletter.title')}
            </h2>
            <p className="font-sans text-sm text-slateblue-300 mt-2 max-w-md">
              {t('newsletter.subtitle')}
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {/* Momčadi links live inside the Klub column — the logo block is the
            footer's anchor and gets the widest track. */}
        <div className="grid grid-cols-2 lg:grid-cols-[1.9fr_1fr_1.3fr] gap-10 lg:gap-14 px-10 lg:px-[72px] pt-[60px] pb-[52px]">
          {/* md: the logo block spans both rows on the left, Klub + Kontakt stack right. */}
          <div className="md:row-span-2 lg:row-span-1">
            <div className="flex items-center gap-4">
              <Image src="/assets/logo.svg" alt="" width={72} height={72} className="block" />
              <div>
                <div className="font-display font-extrabold italic text-white tracking-[.03em] text-[30px] leading-none">
                  HNK KROATIEN
                </div>
                <div className="font-display font-bold text-slateblue-400 tracking-widest3 text-[13px] leading-none mt-[6px]">
                  SCHWYZ · 1995
                </div>
              </div>
            </div>
            <div className="flex gap-[10px] mt-[26px]">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost inline-flex items-center gap-2 px-[14px] py-[7px] text-[11px] tracking-wider2"
                >
                  <SocialIcon name={s.icon} size={15} />
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <FooterCol title={t('footer.clubHeading')} links={clubLinks} />

          <div>
            <h3 className="font-display font-bold text-[13px] tracking-widest2 text-croatia uppercase mb-4">
              {t('footer.contactHeading')}
            </h3>
            <div className="flex flex-col gap-[10px] font-sans font-medium text-sm text-slateblue-200">
              <a href={site.phoneHref} className="hover:text-white transition-colors">{site.phone}</a>
              <a href={`mailto:${site.email}`} className="hover:text-white transition-colors">{site.email}</a>
              <span>{site.address}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slateblue-900 px-10 lg:px-[72px] py-5 flex justify-between items-baseline font-sans font-medium text-xs text-slateblue-500">
          <span className="flex flex-col gap-1">
            <span>© {year}, HNK Kroatien Schwyz. All rights reserved.</span>
            <span className="text-[11px] text-slateblue-600">
              Webseite erstellt von{' '}
              <a href="https://fairweb.ch" target="_blank" rel="noopener" className="hover:text-white transition-colors underline underline-offset-2">
                Fairweb
              </a>
            </span>
          </span>
          <span className="flex gap-2">
            <Link href="/impressum" className="hover:text-white transition-colors">{t('footer.impressum')}</Link>
            <span>·</span>
            <Link href="/datenschutzerklarung" className="hover:text-white transition-colors">{t('footer.datenschutz')}</Link>
            <span>·</span>
            <CookieSettingsLink />
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-6 pt-9">
        <div className="flex items-center gap-3">
          <Image src="/assets/logo.svg" alt="" width={56} height={56} className="block" />
          <div>
            <div className="font-display font-extrabold italic text-white tracking-[.03em] text-[24px] leading-none">
              HNK KROATIEN
            </div>
            <div className="font-display font-bold text-slateblue-400 tracking-widest3 text-[11px] leading-none mt-[5px]">
              SCHWYZ · 1995
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 font-sans font-medium text-[13px] text-slateblue-200 mt-[18px]">
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <span>{site.address}</span>
        </div>
        <div className="flex flex-wrap gap-[10px] mt-5">
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex items-center gap-1.5 px-3 py-2 text-[10px]">
              <SocialIcon name={s.icon} size={13} />
              {s.label}
            </a>
          ))}
        </div>
        <div className="border-t border-slateblue-900 mt-[26px] py-[22px] flex flex-col gap-[6px] font-sans font-medium text-[11px] text-slateblue-500">
          <span>© {year}, HNK Kroatien Schwyz. All rights reserved.</span>
          <span className="text-[10px] text-slateblue-600">
            Webseite erstellt von{' '}
            <a href="https://fairweb.ch" target="_blank" rel="noopener" className="underline underline-offset-2">Fairweb</a>
          </span>
          <span className="flex flex-wrap gap-2">
            <Link href="/impressum">{t('footer.impressum')}</Link>
            <span>·</span>
            <Link href="/datenschutzerklarung">{t('footer.datenschutz')}</Link>
            <span>·</span>
            <CookieSettingsLink />
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-display font-bold text-[13px] tracking-widest2 text-croatia uppercase mb-4">
        {title}
      </h3>
      <div className="flex flex-col gap-[10px] font-sans font-medium text-sm text-slateblue-200">
        {links.map((l, i) => (
          <Link key={i} href={l.href} className="hover:text-white transition-colors w-fit">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
