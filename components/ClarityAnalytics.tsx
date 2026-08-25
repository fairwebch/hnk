'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { readConsent, subscribeConsent } from '@/lib/consent';

const CLARITY_ID = 'y7wfejixoa';

/** Official Clarity snippet + explicit cookie-consent grant via the Clarity
 *  consent API (the tag defaults to cookieless mode for EU traffic until
 *  `clarity('consent')` is called). */
const CLARITY_JS = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");window.clarity('consent');`;

/**
 * Microsoft Clarity, gated behind the "statistics" consent category.
 *
 * - Consent already stored on page load → tag loads afterInteractive.
 * - Consent granted later via the banner → tag loads at that moment
 *   (rendering the <Script> injects it, no refresh needed).
 * - No consent → nothing renders, zero requests to clarity.ms.
 * - Consent revoked while the tag is running → `clarity('consent', false)`
 *   stops cookies/tracking immediately; the script itself disappears on the
 *   next page load because readConsent() then reports statistics=false.
 */
export function ClarityAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (readConsent()?.choices.statistics) setEnabled(true);
    return subscribeConsent((choices) => {
      const clarity = (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity;
      if (choices.statistics) {
        // Re-grant covers the revoke→re-accept case within one page view.
        if (typeof clarity === 'function') clarity('consent');
        setEnabled(true);
      } else if (typeof clarity === 'function') {
        clarity('consent', false);
      }
    });
  }, []);

  if (!enabled) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {CLARITY_JS}
    </Script>
  );
}
