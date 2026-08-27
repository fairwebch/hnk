'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, company, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  const sending = status === 'sending';

  if (status === 'ok') {
    return (
      <p className="font-display font-bold uppercase text-sm tracking-wider2 text-croatia">
        ✓ {t('success')}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md" noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          required
          disabled={sending}
          placeholder={t('placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={t('placeholder')}
          className="flex-1 min-w-0 bg-ink-800 border border-slateblue-700 px-4 py-3 font-sans text-white placeholder:text-slateblue-500 focus:outline-none focus:border-croatia transition-colors disabled:opacity-60"
        />
        <button type="submit" disabled={sending} className="btn-cta shadow-none px-5 py-3 shrink-0 disabled:opacity-70">
          <span>{sending ? t('sending') : t('button')}</span>
        </button>
      </div>

      {/* Honeypot — inline display:none as a belt-and-braces so the bare
          "Company" label can never surface even if the utility CSS fails. */}
      <div className="hidden" style={{ display: 'none' }} aria-hidden>
        <label htmlFor="nl-company">Company</label>
        <input id="nl-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      {status === 'error' && (
        <p className="font-sans text-xs text-slateblue-400 mt-2">{t('error')}</p>
      )}
    </form>
  );
}
