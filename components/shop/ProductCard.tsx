import Image from 'next/image';
import type { ShopProduct } from '@/lib/shop';

export function ProductCard({
  product,
  buyLabel,
}: {
  product: ShopProduct;
  buyLabel: string;
}) {
  return (
    <div className="card group flex flex-col h-full">
      <div className="relative aspect-[3/4] bg-ink-800 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width:768px) 80vw, 25vw"
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold uppercase text-content text-sm leading-snug tracking-[.01em] flex-1">
          {product.name}
        </h3>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-display font-extrabold text-content text-lg whitespace-nowrap">
            {product.price}
          </span>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta px-4 py-2.5"
          >
            <span className="text-[13px]">{buyLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
