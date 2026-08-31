'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

type Status = 'idle' | 'sending' | 'ok' | 'error';

const TOPICS = ['clanstvo', 'momcadi', 'dogadjaji', 'sponzorstvo', 'ostalo'] as const;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = 'name' | 'email' | 'topic' | 'message' | 'consent';
type Errors = Partial<Record<FieldKey, string>>;

export function ContactForm() {
  const t = useTranslations('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const errs: Errors = {};
    if (!name.trim()) errs.name = t('errName');
    if (!email.trim()) errs.email = t('errEmail');
    else if (!emailRe.test(email.trim())) errs.email = t('errEmailInvalid');
    if (!topic) errs.topic = t('errTopic');
    if (!message.trim()) errs.message = t('errMessage');
    if (!consent) errs.consent = t('errConsent');
    return errs;
  }

  function clearError(key: FieldKey) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Send focus to the first field that needs fixing.
      const first = (['name', 'email', 'topic', 'message', 'consent'] as FieldKey[]).find((k) => errs[k]);
      if (first) document.getElementById(`cf-${first}`)?.focus();
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          topic,
          message: message.trim(),
          consent,
          company,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
      setName('');
      setEmail('');
      setPhone('');
      setTopic('');
      setMessage('');
      setConsent(false);
    } catch {
      setStatus('error');
    }
  }

  const field =
    'w-full bg-white border px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors disabled:opacity-60';
  const ok = 'border-line';
  const bad = 'border-croatia';
  const label = 'block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2';
  const errText = 'font-sans text-xs text-croatia mt-1.5';
  const sending = status === 'sending';

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="cf-name" className={label}>{t('formName')} *</label>
        <input
          id="cf-name"
          autoComplete="name"
          value={name}
          disabled={sending}
          onChange={(e) => { setName(e.target.value); clearError('name'); }}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'cf-name-err' : undefined}
          className={`${field} ${errors.name ? bad : ok}`}
        />
        {errors.name && <p id="cf-name-err" className={errText}>{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-email" className={label}>{t('formEmail')} *</label>
          <input
            id="cf-email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={sending}
            onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'cf-email-err' : undefined}
            className={`${field} ${errors.email ? bad : ok}`}
          />
          {errors.email && <p id="cf-email-err" className={errText}>{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="cf-phone" className={label}>
            {t('formPhone')} <span className="normal-case tracking-normal text-content-muted">({t('formOptional')})</span>
          </label>
          <input
            id="cf-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            disabled={sending}
            onChange={(e) => setPhone(e.target.value)}
            className={`${field} ${ok}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cf-topic" className={label}>{t('formTopic')} *</label>
        <select
          id="cf-topic"
          value={topic}
          disabled={sending}
          onChange={(e) => { setTopic(e.target.value); clearError('topic'); }}
          aria-invalid={!!errors.topic}
          aria-describedby={errors.topic ? 'cf-topic-err' : undefined}
          className={`${field} ${errors.topic ? bad : ok} ${topic ? '' : 'text-content-muted'}`}
        >
          <option value="">{t('formTopicPlaceholder')}</option>
          {TOPICS.map((k) => (
            <option key={k} value={k}>{t(`topics.${k}`)}</option>
          ))}
        </select>
        {errors.topic && <p id="cf-topic-err" className={errText}>{errors.topic}</p>}
      </div>

      <div>
        <label htmlFor="cf-message" className={label}>{t('formMessage')} *</label>
        <textarea
          id="cf-message"
          rows={6}
          value={message}
          disabled={sending}
          onChange={(e) => { setMessage(e.target.value); clearError('message'); }}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'cf-message-err' : undefined}
          className={`${field} ${errors.message ? bad : ok}`}
        />
        {errors.message && <p id="cf-message-err" className={errText}>{errors.message}</p>}
      </div>

      {/* Honeypot — inline display:none as a belt-and-braces so the bare
          "Company" label can never surface even if the utility CSS fails. */}
      <div className="hidden" style={{ display: 'none' }} aria-hidden>
        <label htmlFor="cf-company">Company</label>
        <input id="cf-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id="cf-consent"
            type="checkbox"
            checked={consent}
            disabled={sending}
            onChange={(e) => { setConsent(e.target.checked); clearError('consent'); }}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? 'cf-consent-err' : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 accent-croatia"
          />
          <span className="font-sans text-sm text-content-soft">
            {t.rich('consentLabel', {
              link: (chunks) => (
                <Link
                  href="/datenschutzerklarung"
                  target="_blank"
                  className="underline underline-offset-2 hover:text-croatia transition-colors"
                >
                  {chunks}
                </Link>
              ),
            })}{' '}
            *
          </span>
        </label>
        {errors.consent && <p id="cf-consent-err" className={errText}>{errors.consent}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4" aria-live="polite">
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
