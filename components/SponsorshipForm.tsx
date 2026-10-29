'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MIN_IZNOS_CHF, MAX_IZNOS_CHF, type Racun } from '@/lib/turnirSponzorstvo';

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function SponsorshipForm() {
  const t = useTranslations('sponzorstvo');
  const locale = useLocale();

  const [v, setV] = useState({
    ime: '', prezime: '', firma: '', telefon: '', email: '',
    ulica: '', plz: '', mjesto: '', iznos: '', prijedlog: '', napomena: '',
    website: '', // honeypot
  });
  const [racun, setRacun] = useState<Racun>('email');
  const [banner, setBanner] = useState(false);
  const [flyer, setFlyer] = useState(false);
  const [ostalo, setOstalo] = useState(false);
  const [privola, setPrivola] = useState(false);
  const [errors, setErrors] = useState<{ iznos?: string; prijedlog?: string; privola?: string }>({});
  const [status, setStatus] = useState<Status>('idle');
  const okRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'ok') okRef.current?.focus();
  }, [status]);

  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [key]: e.target.value }));

  const iznos = Number(v.iznos);
  const iznosValid = Number.isInteger(iznos) && iznos >= MIN_IZNOS_CHF && iznos <= MAX_IZNOS_CHF;
  const bring = [banner && t('bringBanner'), flyer && t('bringFlyer')].filter(Boolean).join(t('bringAnd'));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    const next: typeof errors = {};
    if (!iznosValid) next.iznos = Number.isInteger(iznos) && iznos > MAX_IZNOS_CHF ? t('iznosMaxError') : t('iznosError');
    if (ostalo && !v.prijedlog.trim()) next.prijedlog = t('prijedlogError');
    if (!privola) next.privola = t('privolaError');
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.iznos ? 'sp-iznos' : next.prijedlog ? 'sp-prijedlog' : 'sp-privola';
      document.getElementById(first)?.focus();
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/sponzorstvo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...v, iznos, racun, banner, flyer, ostalo,
          prijedlog: ostalo ? v.prijedlog : '',
          privola: true, locale,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }

  const field =
    'w-full bg-white border border-line px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors disabled:opacity-60 aria-[invalid=true]:border-croatia';
  const label = 'block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2';
  const section = 'font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia pt-2';
  const errText = 'font-sans text-sm text-croatia mt-1.5';
  const hint = 'font-sans text-sm text-content-muted mt-1.5';
  const sending = status === 'sending';

  if (status === 'ok') {
    return (
      <div ref={okRef} tabIndex={-1} className="py-8 text-center outline-none">
        <div className="font-display font-extrabold italic text-croatia text-4xl mb-3" aria-hidden>✓</div>
        <p className="h-display text-content text-2xl">{t('successTitle')}</p>
        <p className="font-sans text-content-soft mt-2">{t('successText')}</p>
      </div>
    );
  }

  const choice = (checked: boolean) =>
    `flex items-start gap-3 cursor-pointer border px-4 py-3 font-sans text-content transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-content has-[:focus-visible]:ring-offset-2 ${
      checked ? 'border-croatia' : 'border-line hover:border-content-soft'
    } ${sending ? 'opacity-60 pointer-events-none' : ''}`;

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className={section}>{t('sectionData')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sp-ime" className={label}>{t('ime')}</label>
          <input id="sp-ime" required autoComplete="given-name" value={v.ime} disabled={sending} onChange={set('ime')} className={field} />
        </div>
        <div>
          <label htmlFor="sp-prezime" className={label}>{t('prezime')}</label>
          <input id="sp-prezime" required autoComplete="family-name" value={v.prezime} disabled={sending} onChange={set('prezime')} className={field} />
        </div>
        <div>
          <label htmlFor="sp-firma" className={label}>{t('firma')}</label>
          <input id="sp-firma" required autoComplete="organization" value={v.firma} disabled={sending} onChange={set('firma')} className={field} />
        </div>
        <div>
          <label htmlFor="sp-telefon" className={label}>{t('telefon')}</label>
          <input id="sp-telefon" type="tel" required autoComplete="tel" value={v.telefon} disabled={sending} onChange={set('telefon')} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="sp-email" className={label}>{t('email')}</label>
          <input id="sp-email" type="email" required autoComplete="email" value={v.email} disabled={sending} onChange={set('email')} className={field} />
        </div>
      </div>
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.4fr] gap-4">
          <div>
            <label htmlFor="sp-ulica" className={label}>{t('ulica')}</label>
            <input id="sp-ulica" required autoComplete="street-address" value={v.ulica} disabled={sending} onChange={set('ulica')} className={field} />
          </div>
          <div>
            <label htmlFor="sp-plz" className={label}>{t('plz')}</label>
            <input id="sp-plz" required inputMode="numeric" pattern="\d{4,5}" maxLength={5} autoComplete="postal-code"
              value={v.plz} disabled={sending}
              onChange={(e) => setV((s) => ({ ...s, plz: e.target.value.replace(/\D/g, '') }))} className={field} />
          </div>
          <div>
            <label htmlFor="sp-mjesto" className={label}>{t('mjesto')}</label>
            <input id="sp-mjesto" required autoComplete="address-level2" value={v.mjesto} disabled={sending} onChange={set('mjesto')} className={field} />
          </div>
        </div>
        <p className={hint}>{t('addressHint')}</p>
      </div>

      <p className={section}>{t('sectionSupport')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sp-iznos" className={label}>{t('iznos')}</label>
          {/* Bez min/max, step="any": granicu i cijele franke provjerava naša
              poruka (HR/DE), ne preglednikova ugrađena na jeziku preglednika. */}
          <input id="sp-iznos" type="number" inputMode="numeric" step="any" required
            value={v.iznos} disabled={sending}
            onChange={(e) => { set('iznos')(e); setErrors((s) => ({ ...s, iznos: undefined })); }}
            aria-invalid={!!errors.iznos} aria-describedby={errors.iznos ? 'sp-iznos-err' : 'sp-iznos-hint'}
            className={field} />
          {errors.iznos
            ? <p id="sp-iznos-err" className={errText}>{errors.iznos}</p>
            : <p id="sp-iznos-hint" className={hint}>{t('iznosHint')}</p>}
        </div>
        <fieldset>
          <legend className={label}>{t('racun')}</legend>
          <div className="flex flex-wrap gap-3">
            {(['email', 'post'] as const).map((r) => (
              <label key={r} className={`${choice(racun === r)} items-center`}>
                <input type="radio" name="racun" className="accent-croatia" checked={racun === r} disabled={sending} onChange={() => setRacun(r)} />
                {t(r === 'email' ? 'racunEmail' : 'racunPost')}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend className={label}>
          {t('zauzvrat')} <span className="normal-case text-content-muted">({t('optional')})</span>
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className={choice(banner)}>
            <input type="checkbox" className="mt-1 accent-croatia" checked={banner} disabled={sending} onChange={(e) => setBanner(e.target.checked)} />
            {t('banner')}
          </label>
          <label className={choice(flyer)}>
            <input type="checkbox" className="mt-1 accent-croatia" checked={flyer} disabled={sending} onChange={(e) => setFlyer(e.target.checked)} />
            {t('flyer')}
          </label>
          <label className={choice(ostalo)}>
            <input type="checkbox" className="mt-1 accent-croatia" checked={ostalo} disabled={sending}
              onChange={(e) => { setOstalo(e.target.checked); setErrors((s) => ({ ...s, prijedlog: undefined })); }} />
            {t('ostalo')}
          </label>
        </div>
        {bring && (
          <p className="mt-3 bg-paper border-l-2 border-croatia px-4 py-3 font-sans text-sm text-content-soft">
            {t('bringNote', { items: bring })}
          </p>
        )}
        {ostalo && (
          <div className="mt-3">
            <label htmlFor="sp-prijedlog" className={label}>{t('prijedlog')}</label>
            <textarea id="sp-prijedlog" rows={3} maxLength={500} value={v.prijedlog} disabled={sending}
              onChange={(e) => { set('prijedlog')(e); setErrors((s) => ({ ...s, prijedlog: undefined })); }}
              aria-invalid={!!errors.prijedlog} aria-describedby={errors.prijedlog ? 'sp-prijedlog-err' : 'sp-prijedlog-hint'}
              className={field} />
            {errors.prijedlog
              ? <p id="sp-prijedlog-err" className={errText}>{errors.prijedlog}</p>
              : <p id="sp-prijedlog-hint" className={hint}>{t('prijedlogHint')}</p>}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="sp-napomena" className={label}>
          {t('napomena')} <span className="normal-case text-content-muted">({t('optional')})</span>
        </label>
        <textarea id="sp-napomena" rows={3} maxLength={1000} value={v.napomena} disabled={sending} onChange={set('napomena')} className={field} />
      </div>

      {/* Honeypot — skriveno od ljudi */}
      <div className="hidden" aria-hidden>
        <label htmlFor="sp-website">Website</label>
        <input id="sp-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} />
      </div>

      <div>
        <label className="flex items-start gap-3 font-sans text-sm text-content-soft cursor-pointer">
          <input id="sp-privola" type="checkbox" className="mt-0.5 accent-croatia" checked={privola} disabled={sending}
            onChange={(e) => { setPrivola(e.target.checked); setErrors((s) => ({ ...s, privola: undefined })); }}
            aria-invalid={!!errors.privola} aria-describedby={errors.privola ? 'sp-privola-err' : undefined} />
          <span>
            {t.rich('privola', {
              link: (chunks) => (
                <Link href="/datenschutzerklarung" className="underline underline-offset-2 text-croatia hover:text-croatia-dark" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.privola && <p id="sp-privola-err" className={errText}>{errors.privola}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={sending} className="btn-cta px-6 py-3.5 disabled:opacity-70">
          <span>{sending ? t('sending') : t('send')}</span>
        </button>
        {status === 'error' && (
          <span role="alert" className="font-sans text-sm text-croatia">{t('error')}</span>
        )}
      </div>
    </form>
  );
}
