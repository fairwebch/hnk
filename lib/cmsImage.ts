/**
 * Image set as served by every hostpoint-cms API endpoint (sponzori.logo,
 * clan-uprave.image, momcadi.*): three WebP widths produced by
 * hostpoint-cms/public/admin/includes/webp.php, or one sanitized SVG in all
 * three slots when isVector. `alt` is present only where the Sanity schema had
 * an alt subfield (team cover/group photo, gallery).
 */
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
