'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export type LightboxImage = { thumb: string; full: string; srcSet?: string; alt: string };

const SWIPE_X = 50; // px of horizontal drag that triggers prev/next
const SWIPE_Y = 70; // px of downward drag that closes
const AXIS_LOCK = 12; // px before we commit to an axis
const MAX_SCALE = 4;

export function GalleryGrid({ images }: { images: LightboxImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Return focus to the thumbnail the lightbox was opened from.
  useEffect(() => {
    if (open === null && openerRef.current) {
      openerRef.current.focus();
      openerRef.current = null;
    }
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              openerRef.current = e.currentTarget;
              setOpen(i);
            }}
            className="group relative aspect-square overflow-hidden border border-line bg-paper"
            style={{ touchAction: 'manipulation' }}
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
        <Lightbox
          images={images}
          index={open}
          onMove={(dir) => setOpen((cur) => (cur === null ? cur : (cur + dir + images.length) % images.length))}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

type Gesture = {
  mode: 'swipe' | 'pan' | 'pinch' | null;
  axis: 'x' | 'y' | null;
  startX: number;
  startY: number;
  startTx: number;
  startTy: number;
  startScale: number;
  startDist: number;
  moved: boolean;
};

function Lightbox({
  images,
  index,
  onMove,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onMove: (dir: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const img = images[index];

  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Image box sized to the picture's real aspect ratio, so taps outside the
  // photo land on the backdrop (and close), and the close button stays on top.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const dimsRef = useRef<{ w: number; h: number } | null>(null);

  // Zoom / drag state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, live: false });
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  // Browsers don't always fire a click after a drag; auto-clear so a stale
  // flag can't swallow the next real backdrop tap.
  const armSuppress = () => {
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 400);
  };

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setDrag({ x: 0, y: 0, live: false });
  }, []);

  // New image: reset zoom/drag and loading state.
  useEffect(() => {
    setLoaded(false);
    setBox(null);
    dimsRef.current = null;
    resetView();
  }, [index, resetView]);

  const fitBox = useCallback(() => {
    const d = dimsRef.current;
    const st = stageRef.current;
    if (!d || !st) return;
    const r = Math.min(st.clientWidth / d.w, st.clientHeight / d.h, 1);
    setBox({ w: Math.round(d.w * r), h: Math.round(d.h * r) });
  }, []);

  useEffect(() => {
    // Refit on rotate / resize (landscape support).
    window.addEventListener('resize', fitBox);
    return () => window.removeEventListener('resize', fitBox);
  }, [fitBox]);

  // iOS-safe scroll lock: body overflow alone doesn't hold on mobile Safari.
  useEffect(() => {
    const y = window.scrollY;
    const b = document.body;
    const prev = { position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right, overflow: b.style.overflow };
    b.style.position = 'fixed';
    b.style.top = `-${y}px`;
    b.style.left = '0';
    b.style.right = '0';
    b.style.overflow = 'hidden';
    return () => {
      b.style.position = prev.position;
      b.style.top = prev.top;
      b.style.left = prev.left;
      b.style.right = prev.right;
      b.style.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, []);

  // Phone back button closes the lightbox instead of leaving the page.
  const closedByPop = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    window.history.pushState({ hnkLightbox: true }, '');
    const onPop = () => {
      closedByPop.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!closedByPop.current) window.history.back();
    };
  }, []);

  // Keyboard: Escape / arrows + focus trap.
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'ArrowRight') onMoveRef.current(1);
      if (e.key === 'ArrowLeft') onMoveRef.current(-1);
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusables?.length) return;
        const list = Array.from(focusables);
        const cur = document.activeElement as HTMLElement;
        let i = list.indexOf(cur);
        i = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 ? 0 : i + 1);
        list[i].focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Preload neighbours so arrows/swipe feel instant.
  useEffect(() => {
    if (total < 2) return;
    for (const j of [(index + 1) % total, (index - 1 + total) % total]) {
      const pre = new window.Image();
      if (images[j].srcSet) {
        pre.srcset = images[j].srcSet!;
        (pre as any).sizes = '100vw';
      }
      pre.src = images[j].full;
    }
  }, [index, images, total]);

  // --- touch gestures ------------------------------------------------------
  const dist = (t: TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      gesture.current = {
        mode: 'pinch', axis: null,
        startX: 0, startY: 0, startTx: tx, startTy: ty,
        startScale: scale, startDist: dist(e.touches as any), moved: true,
      };
      return;
    }
    const t = e.touches[0];
    gesture.current = {
      mode: scale > 1 ? 'pan' : 'swipe', axis: null,
      startX: t.clientX, startY: t.clientY, startTx: tx, startTy: ty,
      startScale: scale, startDist: 0, moved: false,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === 'pinch' && e.touches.length === 2) {
      const s = Math.min(MAX_SCALE, Math.max(1, (g.startScale * dist(e.touches as any)) / g.startDist));
      setScale(s);
      if (s <= 1.05) { setTx(0); setTy(0); }
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;
    if (!g.moved && Math.hypot(dx, dy) > AXIS_LOCK) g.moved = true;
    if (g.mode === 'pan') {
      setTx(g.startTx + dx);
      setTy(g.startTy + dy);
      return;
    }
    // swipe mode (not zoomed): lock to an axis, give live visual feedback
    if (!g.axis && Math.hypot(dx, dy) > AXIS_LOCK) {
      g.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (g.axis === 'x') setDrag({ x: dx, y: 0, live: true });
    else if (g.axis === 'y') setDrag({ x: 0, y: Math.max(0, dy), live: true }); // only downward
  }

  function onTouchEnd(e: React.TouchEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.mode === 'pinch') {
      if (scale <= 1.05) resetView();
      return;
    }
    // A motionless tap while zoomed still counts toward double-tap (zoom out).
    if (g.mode === 'pan' && g.moved) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;

    if (g.moved) {
      armSuppress(); // a drag must not fire backdrop-close click
      setDrag({ x: 0, y: 0, live: false });
      if (g.axis === 'x' && Math.abs(dx) > SWIPE_X && total > 1) onMove(dx < 0 ? 1 : -1);
      else if (g.axis === 'y' && dy > SWIPE_Y) onClose();
      return;
    }

    // No movement: double-tap on the image toggles zoom.
    const target = e.target as HTMLElement;
    const onImage = !!target.closest('[data-lb-image]');
    const now = Date.now();
    const prev = lastTap.current;
    lastTap.current = { t: now, x: t.clientX, y: t.clientY };
    if (onImage && prev && now - prev.t < 300 && Math.hypot(t.clientX - prev.x, t.clientY - prev.y) < 30) {
      lastTap.current = null;
      armSuppress();
      if (scale > 1) {
        resetView();
      } else {
        const s = 2.5;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        setScale(s);
        setTx((1 - s) * (t.clientX - cx));
        setTy((1 - s) * (t.clientY - cy));
      }
    }
  }

  const btn =
    'flex items-center justify-center text-white/90 hover:text-white active:text-croatia active:scale-90 transition-[color,transform] duration-100';

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={img.alt}
      className="fixed inset-0 z-[60] bg-ink-900/95 outline-none select-none"
      style={{ touchAction: 'none' }}
      onClick={() => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar: counter + close, clear of the notch */}
      <div
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-3"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
      >
        <span
          className="px-2 font-display font-bold text-sm tracking-wider2 text-white/90"
          aria-live="polite"
        >
          {index + 1} / {total}
        </span>
        <button
          type="button"
          aria-label="Zatvori"
          className={`${btn} w-12 h-12`}
          style={{ touchAction: 'manipulation' }}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      {/* Stage: padded clear of bars + safe areas; sized image box inside */}
      <div
        ref={stageRef}
        className="absolute flex items-center justify-center pointer-events-none"
        style={{
          top: 'calc(56px + env(safe-area-inset-top))',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: 'calc(8px + env(safe-area-inset-left))',
          right: 'calc(8px + env(safe-area-inset-right))',
        }}
      >
        <div
          data-lb-image
          className="relative"
          style={{
            // Until real dimensions are known the placeholder spans the stage —
            // it must not eat backdrop taps while the photo is still loading.
            pointerEvents: box ? 'auto' : 'none',
            width: box ? box.w : '100%',
            height: box ? box.h : '100%',
            transform: `translate(${tx + drag.x}px, ${ty + drag.y}px) scale(${scale})`,
            transition: drag.live || gesture.current ? 'none' : 'transform .25s ease',
            opacity: drag.live && drag.y > 0 ? Math.max(0.4, 1 - drag.y / 400) : 1,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Plain img with Sanity-side srcset: no optimizer indirection, and
              neighbour preloads hit the exact same URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.full}
            srcSet={img.srcSet}
            sizes="100vw"
            alt={img.alt}
            draggable={false}
            className={`w-full h-full object-contain transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={(e) => {
              const el = e.currentTarget;
              dimsRef.current = { w: el.naturalWidth, h: el.naturalHeight };
              fitBox();
              setLoaded(true);
            }}
          />
        </div>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="w-9 h-9 border-2 border-white/25 border-t-croatia rounded-full animate-spin" />
          </div>
        )}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Prethodna"
            className={`${btn} absolute z-20 top-1/2 -translate-y-1/2 w-12 h-14`}
            style={{ left: 'max(4px, env(safe-area-inset-left))', touchAction: 'manipulation' }}
            onClick={(e) => { e.stopPropagation(); onMove(-1); }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            type="button"
            aria-label="Sljedeća"
            className={`${btn} absolute z-20 top-1/2 -translate-y-1/2 w-12 h-14`}
            style={{ right: 'max(4px, env(safe-area-inset-right))', touchAction: 'manipulation' }}
            onClick={(e) => { e.stopPropagation(); onMove(1); }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
