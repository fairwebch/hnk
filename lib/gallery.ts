import { urlFor } from '@/sanity/lib/image';
import type { SanityImg } from '@/sanity/lib/types';
import type { LightboxImage } from '@/components/Lightbox';

/** Map Sanity images to lightbox thumb/full URLs.
 *  The lightbox uses Sanity-CDN-side resizing (srcset) directly, so the
 *  browser picks a DPR-appropriate variant and neighbour preloads hit the
 *  exact same URLs. */
export function toLightbox(images: SanityImg[] | undefined, altBase = ''): LightboxImage[] {
  if (!images) return [];
  const w = (img: SanityImg, width: number) =>
    urlFor(img).width(width).fit('max').auto('format').url();
  return images
    .filter((img) => img?.asset)
    .map((img, i) => ({
      thumb: urlFor(img).width(600).height(600).fit('crop').auto('format').url(),
      full: w(img, 1600),
      srcSet: [800, 1200, 1600, 2000].map((x) => `${w(img, x)} ${x}w`).join(', '),
      alt: img.alt || `${altBase} ${i + 1}`.trim(),
    }));
}
