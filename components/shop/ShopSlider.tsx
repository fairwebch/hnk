'use client';

import { useRef } from 'react';
import type { ShopProduct } from '@/lib/shop';
import { ProductCard } from './ProductCard';

export function ShopSlider({
  products,
  buyLabel,
}: {
  products: ShopProduct[];
  buyLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1"
      >
        {products.map((p) => (
          <div
            key={p.slug}
            className="snap-start shrink-0 w-[78%] sm:w-[45%] md:w-[31%] lg:w-[23.5%]"
          >
            <ProductCard product={p} buyLabel={buyLabel} />
          </div>
        ))}
      </div>

      {/* Arrows — desktop */}
      <button
        type="button"
        aria-label="Prethodni"
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-white border border-line text-content hover:text-croatia hover:border-croatia shadow-[0_6px_18px_rgba(19,31,51,.14)] transition-colors"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      <button
        type="button"
        aria-label="Sljedeći"
        onClick={() => scroll(1)}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-white border border-line text-content hover:text-croatia hover:border-croatia shadow-[0_6px_18px_rgba(19,31,51,.14)] transition-colors"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}
