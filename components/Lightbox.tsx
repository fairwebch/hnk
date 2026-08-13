'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

export type LightboxImage = { thumb: string; full: string; alt: string };

export function GalleryGrid({ images }: { images: LightboxImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (dir: number) =>
      setOpen((cur) =>
        cur === null ? cur : (cur + dir + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, move]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden border border-line bg-paper"
          >
            <Image
              src={img.thumb}
              alt={img.alt}
              fill
              sizes="(max-width:768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/20 transition-colors" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[60] bg-ink-900/95 flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Zatvori"
            className="absolute top-5 right-5 w-11 h-11 text-white/80 hover:text-white"
            onClick={close}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <button
            type="button"
            aria-label="Prethodna"
            className="absolute left-3 md:left-8 w-12 h-12 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); move(-1); }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div className="relative max-w-5xl max-h-[85vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[open].full}
              alt={images[open].alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            aria-label="Sljedeća"
            className="absolute right-3 md:right-8 w-12 h-12 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); move(1); }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
