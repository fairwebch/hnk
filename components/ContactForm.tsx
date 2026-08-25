'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function ContactForm() {
  const t = useTranslations('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  const field =
    'w-full bg-white border border-line px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors disabled:opacity-60';
  const label = 'block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2';
  const sending = status === 'sending';

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="cf-name" className={label}>{t('formName')}</label>
        <input id="cf-name" required value={name} disabled={sending} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="cf-email" className={label}>{t('formEmail')}</label>
        <input id="cf-email" type="email" required value={email} disabled={sending} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="cf-message" className={label}>{t('formMessage')}</label>
        <textarea id="cf-message" required rows={6} value={message} disabled={sending} onChange={(e) => setMessage(e.target.value)} className={field} />
      </div>

      {/* Honeypot — inline display:none as a belt-and-braces so the bare
          "Company" label can never surface even if the utility CSS fails. */}
      <div className="hidden" style={{ display: 'none' }} aria-hidden>
        <label htmlFor="cf-company">Company</label>
        <input id="cf-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={sending} className="btn-cta px-6 py-3.5 disabled:opacity-70">
          <span>{sending ? t('formSending') : t('formSend')}</span>
        </button>
        {status === 'ok' && (
          <span className="font-display font-bold uppercase text-xs tracking-wider2 text-croatia">✓ {t('formSuccess')}</span>
        )}
        {status === 'error' && (
          <span className="font-display font-bold uppercase text-xs tracking-wider2 text-content-muted">{t('formError')}</span>
        )}
      </div>
    </form>
  );
}
