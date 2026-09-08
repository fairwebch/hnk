import type { LightboxImage } from '@/components/Lightbox';
import type { CmsImg } from '@/lib/cmsImage';

/** Lightbox mapping for PHP-CMS images: the API already serves three WebP
 *  widths (WIDTHS_WIDE = 480/1200/1920, capped at the source width), so the
 *  srcset is just those three files. Grid thumb prefers the dedicated 600x600
 *  crop when the module provides one. */
export function toLightboxCms(images: CmsImg[] | undefined, altBase = ''): LightboxImage[] {
  if (!images) return [];
  return images.map((img, i) => {
    const cap = (w: number) => (img.width ? Math.min(w, img.width) : w);
    return {
      thumb: img.thumb ?? img.medium,
      full: img.large,
      srcSet: img.isVector
        ? undefined
        : `${img.small} ${cap(480)}w, ${img.medium} ${cap(1200)}w, ${img.large} ${cap(1920)}w`,
      alt: img.alt || `${altBase} ${i + 1}`.trim(),
    };
  });
}
