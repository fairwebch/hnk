'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';

type Props = {
  slug: string;
  vrsta: 'osoba' | 'ekipa';
  pristup: 'javna' | 'clanovi';
  otvorene: boolean;
  rok?: string;
  kotizacija?: string;
};

type Status = 'idle' | 'sending' | 'ok' | 'error' | 'closed' | 'forbidden';

/**
 * Consent-of-the-organizer gated event registration form. Members-only events
 * show the form only with a valid ?kod=… in the URL (validated server-side —
 * the code itself never appears in the page payload).
 */
export function EventRegistration(props: Props) {
  return (
    <Suspense fallback={null}>
      <EventRegistrationInner {...props} />
    </Suspense>
  );
}

function EventRegistrationInner({ slug, vrsta, pristup, otvorene, rok, kotizacija }: Props) {
  const t = useTranslations('prijava');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const kod = searchParams.get('kod');

  const rokIstekao = Boolean(rok && new Date(rok).getTime() < Date.now());
  const zatvorene = !otvorene || rokIstekao;

  // Members-only gate: null = checking, false = no/invalid code, true = show form.
  const [allowed, setAllowed] = useState<boolean | null>(pristup === 'clanovi' ? null : true);

  useEffect(() => {
    if (pristup !== 'clanovi' || zatvorene) return;
    if (!kod) {
      setAllowed(false);
      return;
    }
    let alive = true;
    fetch(`/api/prijava?slug=${encodeURIComponent(slug)}&kod=${encodeURIComponent(kod)}`)
      .then((r) => r.json())
      .then((d) => alive && setAllowed(Boolean(d?.valid)))
      .catch(() => alive && setAllowed(false));
    return () => {
      alive = false;
    };
  }, [pristup, kod, slug, zatvorene]);

  if (zatvorene) {
    return (
      <Wrapper title={t('title')}>
        <Notice text={rokIstekao ? t('rokIstekao') : t('zatvorene')} />
      </Wrapper>
    );
  }

  if (pristup === 'clanovi' && allowed !== true) {
    return (
      <Wrapper title={t('title')}>
        {allowed === null ? (
          <p className="font-sans text-sm text-content-muted">{t('provjera')}</p>
        ) : (
          <Notice text={t('samoClanovi')} />
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper title={t('title')} subtitle={rok ? t('rokDo', { datum: formatRok(rok, locale) }) : undefined}>
      <Form slug={slug} vrsta={vrsta} kod={kod} kotizacija={kotizacija} />
    </Wrapper>
  );
}

function formatRok(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === 'de' ? 'de-CH' : 'hr-HR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function Wrapper({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div id="prijava" className="mt-10">
      <h2 className="h-display text-content text-2xl tracking-[.02em] mb-1">{title}</h2>
      {subtitle && (
        <p className="font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia mb-4">{subtitle}</p>
      )}
      <div className={subtitle ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="card-dashed px-6 py-8">
      <p className="font-sans text-content-soft">{text}</p>
    </div>
  );
}

function Form({ slug, vrsta, kod, kotizacija }: { slug: string; vrsta: 'osoba' | 'ekipa'; kod: string | null; kotizacija?: string }) {
  const t = useTranslations('prijava');
  const locale = useLocale();
  const [v, setV] = useState({
    ime: '', prezime: '', nazivEkipe: '', kontaktOsoba: '',
    email: '', telefon: '', brojOsoba: '1', napomena: '', company: '',
  });
  const [status, setStatus] = useState<Status>('idle');

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/prijava', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: vrsta, slug, kod, locale, company: v.company,
          email: v.email, telefon: v.telefon,
          ...(vrsta === 'osoba'
            ? { ime: v.ime, prezime: v.prezime, brojOsoba: Number(v.brojOsoba) || 1, napomena: v.napomena }
            : { nazivEkipe: v.nazivEkipe, kontaktOsoba: v.kontaktOsoba }),
        }),
      });
      if (res.ok) setStatus('ok');
      else if (res.status === 409) setStatus('closed');
      else if (res.status === 403) setStatus('forbidden');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <Card className="border-l-4 border-l-croatia px-6 py-8">
        <p className="font-display font-bold uppercase text-sm tracking-wider2 text-croatia mb-2">✓ {t('uspjehNaslov')}</p>
        <p className="font-sans text-content-soft">{t('uspjehTekst')}</p>
      </Card>
    );
  }
  if (status === 'closed') return <Notice text={t('zatvorene')} />;
  if (status === 'forbidden') return <Notice text={t('samoClanovi')} />;

  const field =
    'w-full bg-white border border-line px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors disabled:opacity-60';
  const label = 'block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2';
  const sending = status === 'sending';

  return (
    <Card className="p-6 md:p-8"><form onSubmit={submit} className="space-y-4" noValidate>
      {vrsta === 'osoba' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-ime" className={label}>{t('ime')}</label>
              <input id="pr-ime" required value={v.ime} disabled={sending} onChange={set('ime')} className={field} />
            </div>
            <div>
              <label htmlFor="pr-prezime" className={label}>{t('prezime')}</label>
              <input id="pr-prezime" required value={v.prezime} disabled={sending} onChange={set('prezime')} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-email" className={label}>{t('email')}</label>
              <input id="pr-email" type="email" required value={v.email} disabled={sending} onChange={set('email')} className={field} />
            </div>
            <div>
              <label htmlFor="pr-telefon" className={label}>{t('telefon')} <span className="normal-case text-content-muted">({t('neobavezno')})</span></label>
              <input id="pr-telefon" type="tel" value={v.telefon} disabled={sending} onChange={set('telefon')} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="pr-broj" className={label}>{t('brojOsoba')}</label>
            <input id="pr-broj" type="number" min={1} max={50} required value={v.brojOsoba} disabled={sending} onChange={set('brojOsoba')} className={`${field} max-w-[120px]`} />
          </div>
          <div>
            <label htmlFor="pr-napomena" className={label}>{t('napomena')} <span className="normal-case text-content-muted">({t('neobavezno')})</span></label>
            <textarea id="pr-napomena" rows={3} value={v.napomena} disabled={sending} onChange={set('napomena')} className={field} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="pr-ekipa" className={label}>{t('nazivEkipe')}</label>
            <input id="pr-ekipa" required value={v.nazivEkipe} disabled={sending} onChange={set('nazivEkipe')} className={field} />
          </div>
          <div>
            <label htmlFor="pr-kontakt" className={label}>{t('kontaktOsoba')}</label>
            <input id="pr-kontakt" required value={v.kontaktOsoba} disabled={sending} onChange={set('kontaktOsoba')} className={field} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-email2" className={label}>{t('email')}</label>
              <input id="pr-email2" type="email" required value={v.email} disabled={sending} onChange={set('email')} className={field} />
            </div>
            <div>
              <label htmlFor="pr-telefon2" className={label}>{t('telefon')}</label>
              <input id="pr-telefon2" type="tel" value={v.telefon} disabled={sending} onChange={set('telefon')} className={field} />
            </div>
          </div>
        </>
      )}

      {kotizacija && (
        <p className="font-sans text-sm text-content-soft border-l-2 border-croatia pl-3">
          {t('kotizacijaInfo', { iznos: kotizacija })}
        </p>
      )}

      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label htmlFor="pr-company">Company</label>
        <input id="pr-company" tabIndex={-1} autoComplete="off" value={v.company} onChange={set('company')} />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={sending} className="btn-cta px-6 py-3.5 disabled:opacity-70">
          <span>{sending ? t('saljem') : t('posalji')}</span>
        </button>
        {status === 'error' && (
          <span className="font-display font-bold uppercase text-xs tracking-wider2 text-content-muted">{t('greska')}</span>
        )}
      </div>
      <p className="font-sans text-xs text-content-muted">{t('privatnost')}</p>
    </form></Card>
  );
}
