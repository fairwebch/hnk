import Image from 'next/image';
import type { CmsImg } from '@/lib/cmsImage';

/**
 * PHP-CMS counterpart of SanityImage: renders a WebP set from the Hostpoint
 * API (small/medium/large + isVector) with next/image, or the same branded
 * checkerboard placeholder SanityImage shows when there's no image. `large`
 * is always the source so the optimizer has the most pixels to derive a
 * srcset from; `sizes` still governs what the browser actually downloads.
 */
export function CmsImage({
  image,
  alt = '',
  width = 800,
  height = 600,
  className = '',
  sizes,
  fill = false,
  priority = false,
}: {
  image?: CmsImg | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
}) {
  if (!image) {
    return (
      <div
        className={`relative bg-paper flex items-center justify-center overflow-hidden ${className}`}
        style={fill ? undefined : { width, height }}
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background:
              'repeating-conic-gradient(#D8232F 0% 25%, #FFFFFF 0% 50%) 0 0 / 28px 28px',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo.svg" alt="" className="relative w-16 h-16 opacity-40" />
      </div>
    );
  }

  const resolvedAlt = image.alt || alt;

  if (fill) {
    return (
      <Image
        src={image.large}
        alt={resolvedAlt}
        fill
        sizes={sizes ?? '100vw'}
        priority={priority}
        className={className}
        unoptimized={image.isVector}
      />
    );
  }

  return (
    <Image
      src={image.large}
      alt={resolvedAlt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
      unoptimized={image.isVector}
    />
  );
}
