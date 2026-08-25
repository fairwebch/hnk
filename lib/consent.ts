'use client';

/** Cookie-consent model: versioned, 12-month validity, Google Consent Mode
 *  v2 aware. No external consent services. */

// v2: Microsoft Clarity added to the statistics category (2026-08).
export const CONSENT_VERSION = 2;
const KEY = 'hnk-consent';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

export type ConsentChoices = {
  statistics: boolean;
  external: boolean;
};

export type StoredConsent = {
  v: number;
  ts: string; // ISO timestamp of the choice — proof of when consent was given
  choices: ConsentChoices;
};

export const DENIED_ALL: ConsentChoices = { statistics: false, external: false };

export function readConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.v !== CONSENT_VERSION) return null; // new services → re-ask
    if (Date.now() - new Date(parsed.ts).getTime() > MAX_AGE_MS) return null;
    if (typeof parsed.choices?.statistics !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(choices: ConsentChoices) {
  const record: StoredConsent = {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    choices,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — consent still applies for this page view */
  }
  applyConsentMode(choices);
  window.dispatchEvent(new CustomEvent('hnk:consent-changed', { detail: choices }));
}

/** Google Consent Mode v2 update (defaults are set to denied inline in the
 *  layout before anything else loads). */
export function applyConsentMode(choices: ConsentChoices) {
  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', {
      analytics_storage: choices.statistics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}

export function subscribeConsent(cb: (c: ConsentChoices) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentChoices>).detail);
  window.addEventListener('hnk:consent-changed', handler);
  return () => window.removeEventListener('hnk:consent-changed', handler);
}

/** Re-opens the consent settings dialog (footer "Cookie settings" link). */
export function openConsentSettings() {
  window.dispatchEvent(new Event('hnk:cookie-settings'));
}
