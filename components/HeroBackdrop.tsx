'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const INTERVAL_MS = 9000; // per-slide dwell for the slow crossfade
const FADE_MS = 1800;

/**
 * Hero background: 1 photo = static, 2–3 photos = slow crossfade with no
 * controls and no layout shift (all slides are absolutely stacked). Respects
 * prefers-reduced-motion (stays on the first, priority-loaded slide — the LCP
 * element). The navy overlay + text-side gradient keep the copy WCAG AA.
 */
export function HeroBackdrop({ srcs }: { srcs: string[] }) {
  const [idx, setIdx] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (srcs.length < 2) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [srcs.length]);

  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % srcs.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [animate, srcs.length]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {srcs.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          loading={i === 0 ? undefined : 'lazy'}
          sizes="100vw"
          className={`object-cover transition-opacity ease-in-out ${
            i === (animate ? idx : 0) ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ))}
      {/* Navy wash + stronger gradient on the text side + bottom anchor */}
      <div className="absolute inset-0 bg-ink-900/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/55 to-ink-900/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-transparent to-ink-900/30" />
    </div>
  );
}
