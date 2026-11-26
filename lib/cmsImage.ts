/**
 * Image set as served by every hostpoint-cms API endpoint (sponzori.logo,
 * clan-uprave.image, momcadi.*): three WebP widths produced by
 * hostpoint-cms/public/admin/includes/webp.php, or one sanitized SVG in all
 * three slots when isVector. `alt` is present only where the Sanity schema had
 * an alt subfield (team cover/group photo, gallery).
 */
/** Which part of an image stays visible when a card crops it (object-fit: cover). */
export type ImageFocus = 'center' | 'left' | 'right' | 'top' | 'bottom';

const FOCUS_POSITION: Record<ImageFocus, string | undefined> = {
  center: undefined, // browser default (50% 50%) — no inline style, markup unchanged
  left: '0% 50%',
  right: '100% 50%',
  top: '50% 0%',
  bottom: '50% 100%',
};

export function focusToObjectPosition(focus?: ImageFocus): string | undefined {
  return focus ? FOCUS_POSITION[focus] : undefined;
}

export interface CmsImg {
  /** 600x600 centre crop for grids — only on gallery images (galerije module). */
  thumb?: string;
  small: string;
  medium: string;
  large: string;
  isVector: boolean;
  width: number | null;
  height: number | null;
  alt?: string | null;
}
