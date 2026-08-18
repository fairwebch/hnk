import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { site } from '@/lib/site';
import { NewsletterForm } from '@/components/NewsletterForm';

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const socials = [
    { label: 'FACEBOOK', href: site.social.facebook },
    { label: 'INSTAGRAM', href: site.social.instagram },
    { label: 'WHATSAPP', href: site.social.whatsapp },
  ];
  const teamLinks = [
    { label: t('footer.links.aktivni'), href: '/momcadi' },
    { label: t('footer.links.seniori'), href: '/momcadi' },
    { label: t('footer.links.juniori16'), href: '/momcadi' },
    { label: t('footer.links.juniori12'), href: '/momcadi' },
  ];
  const clubLinks = [
    { label: t('nav.oKlubu'), href: '/klub' },
    { label: t('footer.links.uprava'), href: '/uprava' },
    { label: t('nav.momcadi'), href: '/momcadi' },
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
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1.3fr] gap-14 px-[72px] pt-[60px] pb-[52px]">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/assets/logo.svg" alt="" width={44} height={44} className="block" />
              <div>
                <div className="font-display font-extrabold italic text-white tracking-[.03em] text-[18px] leading-none">
                  HNK KROATIEN
                </div>
                <div className="font-display font-bold text-slateblue-400 tracking-widest3 text-[9px] leading-none mt-[3px]">
                  SCHWYZ · 1995
                </div>
              </div>
            </div>
            <p className="font-sans text-sm leading-relaxed text-slateblue-300 mt-[18px] max-w-[340px]">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-[10px] mt-[22px]">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost px-[14px] py-[7px] text-[11px] tracking-wider2"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <FooterCol title={t('footer.teamsHeading')} links={teamLinks} />
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

        <div className="border-t border-slateblue-900 px-[72px] py-5 flex justify-between font-sans font-medium text-xs text-slateblue-500">
          <span>© {year} HNK Kroatien Schwyz — {t('footer.rights')}</span>
          <span className="flex gap-2">
            <Link href="/impressum" className="hover:text-white transition-colors">{t('footer.impressum')}</Link>
            <span>·</span>
            <Link href="/datenschutzerklarung" className="hover:text-white transition-colors">{t('footer.datenschutz')}</Link>
          </span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden px-6 pt-9">
        <div className="flex items-center gap-[10px]">
          <Image src="/assets/logo.svg" alt="" width={38} height={38} className="block" />
          <div className="font-display font-extrabold italic text-white tracking-[.03em] text-[16px] leading-none">
            HNK KROATIEN SCHWYZ
          </div>
        </div>
        <p className="font-sans text-[13px] leading-relaxed text-slateblue-300 mt-[14px]">
          {t('footer.tagline')}
        </p>
        <div className="flex flex-col gap-2 font-sans font-medium text-[13px] text-slateblue-200 mt-[18px]">
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <span>{site.address}</span>
        </div>
        <div className="flex gap-[10px] mt-5">
          {socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-2 text-[10px]">
              {s.label}
            </a>
          ))}
        </div>
        <div className="border-t border-slateblue-900 mt-[26px] py-[22px] flex flex-col gap-[6px] font-sans font-medium text-[11px] text-slateblue-500">
          <span>© {year} HNK Kroatien Schwyz — {t('footer.rights')}</span>
          <span className="flex gap-2">
            <Link href="/impressum">{t('footer.impressum')}</Link>
            <span>·</span>
            <Link href="/datenschutzerklarung">{t('footer.datenschutz')}</Link>
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
