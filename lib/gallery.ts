import { urlFor } from '@/sanity/lib/image';
import type { SanityImg } from '@/sanity/lib/types';
import type { LightboxImage } from '@/components/Lightbox';

/** Map Sanity images to lightbox thumb/full URLs. */
export function toLightbox(images: SanityImg[] | undefined, altBase = ''): LightboxImage[] {
  if (!images) return [];
  return images
    .filter((img) => img?.asset)
    .map((img, i) => ({
      thumb: urlFor(img).width(600).height(600).fit('crop').auto('format').url(),
      full: urlFor(img).width(1800).fit('max').auto('format').url(),
      alt: img.alt || `${altBase} ${i + 1}`.trim(),
    }));
}
