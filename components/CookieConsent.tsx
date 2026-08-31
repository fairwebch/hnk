'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  applyConsentMode,
  DENIED_ALL,
  readConsent,
  saveConsent,
  type ConsentChoices,
} from '@/lib/consent';

type View = 'hidden' | 'banner' | 'settings';

/** Layered cookie banner: level 1 (short, equal Accept/Reject buttons, no X),
 *  level 2 (per-category toggles + per-service details). Renders nothing on
 *  the server — no layout shift, and never appears under /studio (mounted
 *  only in the [locale] layout). */
export function CookieConsent() {
  const t = useTranslations('consent');
  const [view, setView] = useState<View>('hidden');
  const [draft, setDraft] = useState<ConsentChoices>(DENIED_ALL);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      // Re-announce the stored choice to Consent Mode on every page load.
      applyConsentMode(stored.choices);
    } else {
      setView('banner');
    }

    const openSettings = () => {
      setDraft(readConsent()?.choices ?? DENIED_ALL);
      setView('settings');
    };
    window.addEventListener('hnk:cookie-settings', openSettings);
    return () => window.removeEventListener('hnk:cookie-settings', openSettings);
  }, []);

  // Scroll lock + focus while the settings dialog is open.
  useEffect(() => {
    if (view !== 'settings') return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [view]);

  const decide = useCallback((choices: ConsentChoices) => {
    saveConsent(choices);
    setView('hidden');
  }, []);

  /** Closing the settings dialog without saving keeps the stored choice; if
   *  there is none yet, the level-1 banner comes back (no silent dismissal). */
  const closeSettings = useCallback(() => {
    setView(readConsent() ? 'hidden' : 'banner');
  }, []);

  if (view === 'hidden') return null;

  const equalBtn =
    'flex-1 sm:flex-none sm:min-w-[160px] inline-flex justify-center items-center border-2 border-white bg-white text-ink-800 font-display font-extrabold uppercase tracking-wider2 text-[13px] px-5 py-3 hover:bg-slateblue-100 hover:border-slateblue-100 transition-colors';

  return (
    <>
      {view === 'banner' && (
        <div
          role="region"
          aria-label={t('settingsTitle')}
          className="fixed inset-x-0 bottom-0 z-[35] bg-ink-800 border-t-2 border-croatia shadow-[0_-10px_30px_rgba(0,0,0,.35)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="container-x py-4 md:py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <p className="font-sans text-[13px] md:text-sm text-slateblue-200 leading-relaxed lg:flex-1">
              <span className="font-display font-extrabold uppercase tracking-wider2 text-white text-[13px] mr-2">
                {t('bannerTitle')}
              </span>
              {t.rich('bannerText', {
                link: (chunks) => (
                  <Link
                    href="/datenschutzerklarung"
                    className="underline underline-offset-2 text-white hover:text-croatia transition-colors"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button type="button" onClick={() => decide({ statistics: false, external: false })} className={equalBtn}>
                {t('rejectAll')}
              </button>
              <button type="button" onClick={() => decide({ statistics: true, external: true })} className={equalBtn}>
                {t('acceptAll')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(readConsent()?.choices ?? DENIED_ALL);
                  setView('settings');
                }}
                className="basis-full sm:basis-auto text-left font-sans font-medium text-[13px] text-slateblue-300 underline underline-offset-2 hover:text-white transition-colors px-1 py-1"
              >
                {t('settings')}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink-800/70" onClick={closeSettings} aria-hidden />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('settingsTitle')}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSettings();
            }}
            className="relative w-full sm:max-w-[640px] max-h-[88dvh] sm:max-h-[85dvh] overflow-y-auto bg-white sm:mx-4 outline-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="sticky top-0 bg-white border-b border-line px-5 md:px-7 py-4 flex items-center justify-between gap-4 z-10">
              <h2 className="h-display text-ink-800 text-xl md:text-2xl leading-none">
                {t('settingsTitle')}
              </h2>
              <button
                type="button"
                onClick={closeSettings}
                aria-label={t('close')}
                className="shrink-0 w-9 h-9 inline-flex items-center justify-center border-2 border-line text-content hover:border-croatia hover:text-croatia transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            <div className="px-5 md:px-7 py-5">
              <p className="font-sans text-sm text-content/80 leading-relaxed mb-5">
                {t('settingsIntro')}
              </p>

              <Category
                name={t('cat.necessary.name')}
                desc={t('cat.necessary.desc')}
                checked
                locked
                lockedLabel={t('alwaysOn')}
                services={['consentStore', 'locale']}
              />
              <Category
                name={t('cat.statistics.name')}
                desc={t('cat.statistics.desc')}
                checked={draft.statistics}
                onChange={(v) => setDraft((d) => ({ ...d, statistics: v }))}
                services={['clarity', 'ga']}
              />
              <Category
                name={t('cat.external.name')}
                desc={t('cat.external.desc')}
                checked={draft.external}
                onChange={(v) => setDraft((d) => ({ ...d, external: v }))}
                services={['maps']}
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => decide(draft)}
                  className="btn-cta px-6 py-3 justify-center"
                >
                  <span className="text-[13px]">{t('save')}</span>
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => decide({ statistics: false, external: false })}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center border-2 border-content/30 text-content font-display font-bold uppercase tracking-wider2 text-[12px] px-5 py-3 hover:border-croatia hover:text-croatia transition-colors"
                  >
                    {t('rejectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide({ statistics: true, external: true })}
                    className="flex-1 sm:flex-none inline-flex justify-center items-center border-2 border-content/30 text-content font-display font-bold uppercase tracking-wider2 text-[12px] px-5 py-3 hover:border-croatia hover:text-croatia transition-colors"
                  >
                    {t('acceptAll')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Category({
  name,
  desc,
  checked,
  locked,
  lockedLabel,
  onChange,
  services,
}: {
  name: string;
  desc: string;
  checked: boolean;
  locked?: boolean;
  lockedLabel?: string;
  onChange?: (v: boolean) => void;
  services: string[];
}) {
  const t = useTranslations('consent');
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-line mb-3">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="font-display font-extrabold uppercase tracking-wider2 text-[13px] text-ink-800">
            {name}
          </div>
          <p className="font-sans text-[13px] text-content/70 leading-relaxed mt-1">{desc}</p>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="font-sans font-medium text-xs text-croatia underline underline-offset-2 mt-2"
          >
            {open ? t('hideServices') : t('showServices')}
          </button>
        </div>
        {locked ? (
          <span className="shrink-0 font-display font-bold uppercase text-[10px] tracking-wider2 text-content/50 border border-line px-2 py-1 mt-1">
            {lockedLabel}
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={name}
            onClick={() => onChange?.(!checked)}
            className={`shrink-0 relative w-12 h-7 rounded-full transition-colors mt-1 ${
              checked ? 'bg-croatia' : 'bg-content/25'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                checked ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 py-3 flex flex-col gap-3">
          {services.map((key) => (
            <dl key={key} className="font-sans text-xs leading-relaxed">
              <dt className="font-bold text-ink-800">{t(`services.${key}.name`)}</dt>
              <dd className="text-content/70">
                {t('providerLabel')}: {t(`services.${key}.provider`)}
              </dd>
              <dd className="text-content/70">
                {t('purposeLabel')}: {t(`services.${key}.purpose`)}
              </dd>
              <dd className="text-content/70">
                {t('durationLabel')}: {t(`services.${key}.duration`)}
              </dd>
            </dl>
          ))}
        </div>
      )}
    </div>
  );
}
