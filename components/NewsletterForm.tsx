'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Status = 'idle' | 'sending' | 'ok' | 'error';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  // Client-side validation message ("enter an email" / "invalid email") —
  // separate from the server-error status so each shows the right text.
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;

    const value = email.trim();
    if (!value) {
      setFieldError(t('errorRequired'));
      inputRef.current?.focus();
      return;
    }
    if (!emailRe.test(value)) {
      setFieldError(t('errorInvalid'));
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);

    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value, company, locale }),
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
          ref={inputRef}
          type="email"
          disabled={sending}
          placeholder={t('placeholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(null);
          }}
          aria-label={t('placeholder')}
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? 'nl-email-err' : undefined}
          className={`flex-1 min-w-0 bg-ink-800 border px-4 py-3 font-sans text-white placeholder:text-slateblue-500 focus:outline-none focus:border-croatia transition-colors disabled:opacity-60 ${
            fieldError ? 'border-croatia' : 'border-slateblue-700'
          }`}
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

      <div aria-live="polite">
        {fieldError && (
          // Brighter red than the brand token — #D8232F fails contrast on the navy footer.
          <p id="nl-email-err" className="font-sans text-xs text-[#ff6b74] mt-2">{fieldError}</p>
        )}
        {!fieldError && status === 'error' && (
          <p className="font-sans text-xs text-slateblue-400 mt-2">{t('error')}</p>
        )}
      </div>
    </form>
  );
}
