'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { site } from '@/lib/site';

export function ContactForm() {
  const t = useTranslations('contact');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Kontakt · ${name || 'HNK Kroatien Schwyz'}`);
    const body = encodeURIComponent(
      `${message}\n\n—\n${name}${email ? `\n${email}` : ''}`,
    );
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  }

  const field =
    'w-full bg-white border border-line px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="cf-name" className="block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2">
          {t('formName')}
        </label>
        <input id="cf-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="cf-email" className="block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2">
          {t('formEmail')}
        </label>
        <input id="cf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="cf-message" className="block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2">
          {t('formMessage')}
        </label>
        <textarea id="cf-message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={field} />
      </div>
      <button type="submit" className="btn-cta px-6 py-3.5">
        <span>{t('formSend')}</span>
      </button>
    </form>
  );
}
