'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

function diff(target: number) {
  const total = target - Date.now();
  const clamped = Math.max(total, 0);
  return {
    total,
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped / 3_600_000) % 24),
    minutes: Math.floor((clamped / 60_000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
  };
}

export function EventCountdown({
  date,
  size = 'md',
}: {
  date: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const t = useTranslations('events');
  const target = new Date(date).getTime();
  const [time, setTime] = useState(() => diff(target));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(diff(target));
    const id = setInterval(() => setTime(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  // Finished more than 4h ago → treat as done.
  if (mounted && time.total < -4 * 3_600_000) {
    return (
      <span className="inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider2 text-slateblue-400 text-sm">
        {t('finished')}
      </span>
    );
  }
  // In progress window.
  if (mounted && time.total <= 0) {
    return (
      <span className="inline-flex items-center gap-2 font-display font-bold uppercase tracking-wider2 text-croatia text-sm">
        <span className="w-2 h-2 rounded-full bg-croatia animate-pulse" />
        {t('live')}
      </span>
    );
  }

  const units = [
    { v: time.days, l: t('days') },
    { v: time.hours, l: t('hours') },
    { v: time.minutes, l: t('minutes') },
    { v: time.seconds, l: t('seconds') },
  ];

  const box =
    size === 'lg'
      ? 'min-w-[68px] px-3 py-3 text-3xl md:text-4xl'
      : size === 'sm'
        ? 'min-w-[44px] px-2 py-2 text-lg'
        : 'min-w-[56px] px-2.5 py-2.5 text-2xl';

  return (
    <div className="flex items-stretch gap-2" role="timer" aria-live="off">
      {units.map((u, i) => (
        <div
          key={i}
          className={`flex flex-col items-center rounded-md bg-ink-800 border border-slateblue-800 ${box}`}
        >
          <span className="font-display font-extrabold text-white leading-none tabular-nums">
            {mounted ? String(u.v).padStart(2, '0') : '––'}
          </span>
          <span className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400 mt-1">
            {u.l}
          </span>
        </div>
      ))}
    </div>
  );
}
