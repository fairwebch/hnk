'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Status = 'idle' | 'sending' | 'ok' | 'error';
type Suggestion = { id: number; street: string; plz: string; city: string };

const SEARCH_URL = 'https://api3.geo.admin.ch/rest/services/api/SearchServer';

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** "Mythencenterstrasse 21 <b>6438 Ibach</b>" → street / plz / city */
function parseAddressLabel(label: string): { street: string; plz: string; city: string } {
  const m = label.match(/^(.*?)<b>(.*?)<\/b>/);
  if (!m) return { street: stripTags(label), plz: '', city: '' };
  const street = stripTags(m[1]);
  const inner = stripTags(m[2]);
  const pm = inner.match(/^(\d{4})\s+(.+)$/);
  return pm ? { street, plz: pm[1], city: pm[2] } : { street, plz: '', city: inner };
}

export function MembershipForm() {
  const t = useTranslations('membership');
  const locale = useLocale();

  const [gender, setGender] = useState<'m' | 'f' | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [plz, setPlz] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipSearch = useRef(false); // set right after a suggestion is picked
  const skipPlzLookup = useRef(false); // PLZ set from a picked suggestion — don't re-resolve the city
  const cityTouched = useRef(false); // user typed the city manually — don't overwrite
  const abortRef = useRef<AbortController | null>(null);
  const okRef = useRef<HTMLDivElement | null>(null);

  // Move focus to the confirmation so screen readers announce the outcome
  // (the submit button the user focused is unmounted with the form).
  useEffect(() => {
    if (status === 'ok') okRef.current?.focus();
  }, [status]);

  // Live address search (debounced) while typing in the street field.
  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const q = street.trim();
    if (q.length < 3) {
      abortRef.current?.abort(); // a late response must not reopen the list
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const url =
          `${SEARCH_URL}?searchText=${encodeURIComponent(q)}` +
          `&type=locations&origins=address&limit=8`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const items: Suggestion[] = (data?.results ?? [])
          .map((r: any, i: number) => ({ id: r?.id ?? i, ...parseAddressLabel(String(r?.attrs?.label ?? '')) }))
          .filter((s: Suggestion) => s.street);
        setSuggestions(items);
        setOpen(items.length > 0);
        setActive(-1);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          // Autocomplete is best-effort — manual entry always works.
          setSuggestions([]);
          setOpen(false);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [street]);

  // PLZ typed manually (before/without picking an address) → look up the city.
  useEffect(() => {
    if (skipPlzLookup.current) {
      skipPlzLookup.current = false;
      return;
    }
    if (!/^\d{4}$/.test(plz) || cityTouched.current) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const url =
          `${SEARCH_URL}?searchText=${encodeURIComponent(plz)}` +
          `&type=locations&origins=zipcode&limit=8`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        for (const r of data?.results ?? []) {
          // "<b>6438 - Ibach</b>"
          const m = stripTags(String(r?.attrs?.label ?? '')).match(/^(\d{4})\s*-\s*(.+)$/);
          if (m && m[1] === plz) {
            // Re-check: the user may have started typing the city while the
            // request was in flight.
            if (!cityTouched.current) setCity(m[2]);
            break;
          }
        }
      } catch {
        /* best-effort */
      }
    })();
    return () => ctrl.abort();
  }, [plz]);

  function pick(s: Suggestion) {
    abortRef.current?.abort(); // a late response must not reopen the list
    if (s.street !== street) {
      skipSearch.current = true;
      setStreet(s.street);
    }
    if (s.plz && s.plz !== plz) {
      skipPlzLookup.current = true;
      setPlz(s.plz);
    }
    if (s.city) {
      setCity(s.city);
      cityTouched.current = false;
    }
    setOpen(false);
    setSuggestions([]);
  }

  function onStreetKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/postani-clan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gender, firstName, lastName, street, plz, city, phone, email, company, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  }

  const field =
    'w-full bg-white border border-line px-4 py-3 font-sans text-content placeholder:text-content-muted focus:outline-none focus:border-croatia transition-colors disabled:opacity-60';
  const label = 'block font-display font-bold uppercase text-xs tracking-wider2 text-content-soft mb-2';
  const sending = status === 'sending';

  if (status === 'ok') {
    return (
      <div ref={okRef} tabIndex={-1} className="py-6 text-center outline-none">
        <div className="font-display font-extrabold italic text-croatia text-3xl mb-3">✓</div>
        <p className="font-display font-bold uppercase text-sm tracking-wider2 text-content">
          {t('success')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* 1. Gender */}
      <div>
        <span className={label}>{t('gender')}</span>
        <div className="flex gap-3" role="radiogroup" aria-label={t('gender')}>
          {(['m', 'f'] as const).map((g) => (
            <label
              key={g}
              className={`cursor-pointer border px-6 py-3 font-display font-bold uppercase text-xs tracking-wider2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-content has-[:focus-visible]:ring-offset-2 ${
                gender === g
                  ? 'border-croatia text-croatia'
                  : 'border-line text-content-soft hover:border-content-soft'
              } ${sending ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="radio"
                name="gender"
                required
                disabled={sending}
                className="sr-only"
                checked={gender === g}
                onChange={() => setGender(g)}
              />
              {t(g === 'm' ? 'male' : 'female')}
            </label>
          ))}
        </div>
      </div>

      {/* 2–3. Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="mf-first" className={label}>{t('firstName')}</label>
          <input id="mf-first" required autoComplete="given-name" value={firstName} disabled={sending}
            onChange={(e) => setFirstName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="mf-last" className={label}>{t('lastName')}</label>
          <input id="mf-last" required autoComplete="family-name" value={lastName} disabled={sending}
            onChange={(e) => setLastName(e.target.value)} className={field} />
        </div>
      </div>

      {/* 4. Street with autocomplete */}
      <div className="relative">
        <label htmlFor="mf-street" className={label}>{t('street')}</label>
        <input
          id="mf-street"
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="mf-street-list"
          aria-activedescendant={open && active >= 0 ? `mf-street-opt-${active}` : undefined}
          placeholder={t('streetPlaceholder')}
          value={street}
          disabled={sending}
          onChange={(e) => setStreet(e.target.value)}
          onKeyDown={onStreetKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className={field}
        />
        {open && (
          <ul
            id="mf-street-list"
            role="listbox"
            onMouseDown={(e) => e.preventDefault()} // scrollbar drag must not blur-close the list
            className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-line shadow-lg max-h-72 overflow-auto"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`mf-street-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-4 py-2.5 cursor-pointer font-sans text-sm ${
                  i === active ? 'bg-paper text-croatia' : 'text-content'
                }`}
              >
                {s.street}
                <span className="text-content-muted"> · {s.plz} {s.city}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 5–6. PLZ + City */}
      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <div>
          <label htmlFor="mf-plz" className={label}>{t('plz')}</label>
          <input
            id="mf-plz"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="postal-code"
            value={plz}
            disabled={sending}
            onChange={(e) => setPlz(e.target.value.replace(/\D/g, ''))}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="mf-city" className={label}>{t('city')}</label>
          <input
            id="mf-city"
            required
            autoComplete="address-level2"
            value={city}
            disabled={sending}
            onChange={(e) => {
              cityTouched.current = true;
              setCity(e.target.value);
            }}
            className={field}
          />
        </div>
      </div>

      {/* 7–8. Phone + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="mf-phone" className={label}>
            {t('phone')} <span className="normal-case text-content-muted">({t('optional')})</span>
          </label>
          <input id="mf-phone" type="tel" autoComplete="tel" value={phone} disabled={sending}
            onChange={(e) => setPhone(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="mf-email" className={label}>{t('email')}</label>
          <input id="mf-email" type="email" required autoComplete="email" value={email} disabled={sending}
            onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
      </div>

      {/* Honeypot — hidden from users */}
      <div className="hidden" aria-hidden>
        <label htmlFor="mf-company">Company</label>
        <input id="mf-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={sending} className="btn-cta px-6 py-3.5 disabled:opacity-70">
          <span>{sending ? t('sending') : t('send')}</span>
        </button>
        {status === 'error' && (
          <span role="alert" className="font-display font-bold uppercase text-xs tracking-wider2 text-content-muted">
            {t('error')}
          </span>
        )}
      </div>
    </form>
  );
}
