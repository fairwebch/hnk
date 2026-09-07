import { urlFor } from '@/sanity/lib/image';
import type { SanityImg } from '@/sanity/lib/types';
import type { LightboxImage } from '@/components/Lightbox';
import type { CmsImg } from '@/lib/cmsImage';

/** PHP-CMS counterpart of toLightbox: the API already serves three WebP
 *  widths (WIDTHS_WIDE = 480/1200/1920, capped at the source width), so the
 *  srcset is just those three files. */
export function toLightboxCms(images: CmsImg[] | undefined, altBase = ''): LightboxImage[] {
  if (!images) return [];
  return images.map((img, i) => {
    const cap = (w: number) => (img.width ? Math.min(w, img.width) : w);
    return {
      thumb: img.medium,
      full: img.large,
      srcSet: img.isVector
        ? undefined
        : `${img.small} ${cap(480)}w, ${img.medium} ${cap(1200)}w, ${img.large} ${cap(1920)}w`,
      alt: img.alt || `${altBase} ${i + 1}`.trim(),
    };
  });
}

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
