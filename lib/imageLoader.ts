/**
 * Global next/image loader (next.config.mjs → images.loaderFile).
 *
 * Zaobilazi Vercelov image optimizer (/_next/image), koji vraća 402
 * OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED kad se potroši kvota — tad nijedna
 * slika sa sajta ne bi bila prikazana. Hostpoint CMS ionako već generira
 * responzivne WebP varijante (small/medium/large + thumb, vidi
 * hostpoint-cms/public/admin/includes/webp.php), pa ovdje samo biramo pravu
 * varijantu prema traženoj širini, a lokalne /public datoteke servira kao što
 * jesu (male su, ≤ ~230 KB).
 */

type Variant = 'small' | 'medium' | 'large';

// Nominalne širine generiranih varijanti po skupu (WebpPipeline::WIDTHS*).
const NARROW: Record<Variant, number> = { small: 240, medium: 480, large: 800 }; // logotipi, portreti
const WIDE: Record<Variant, number> = { small: 480, medium: 1200, large: 1920 }; // fotografije (hero ima 2560)
const SQUARE: Record<Variant, number> = { small: 400, medium: 800, large: 1200 }; // flyer 1:1

const CMS_VARIANT_URL = /^(https?:\/\/[^?#]+\/uploads\/[^?#]+)-(thumb|small|medium|large)\.webp$/;

function widthsFor(base: string): Record<Variant, number> {
  if (/\/uploads\/(sponzori|clan-uprave)\//.test(base)) return NARROW;
  const file = base.slice(base.lastIndexOf('/') + 1);
  if (/^(igrac|trener|sponsor-custom)-/.test(file)) return NARROW;
  if (/^flyer-/.test(file)) return SQUARE;
  return WIDE;
}

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const m = CMS_VARIANT_URL.exec(src);
  if (!m) return src; // lokalni /assets/* i sve ostalo: bez transformacije

  const [, base, current] = m;
  // Kvadratni crop (galerija grid) ne smije se zamijeniti drugom varijantom.
  if (current === 'thumb') return src;

  const widths = widthsFor(base);
  const variant: Variant = width <= widths.small ? 'small' : width <= widths.medium ? 'medium' : 'large';
  return `${base}-${variant}.webp`;
}
