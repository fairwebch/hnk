import Image from 'next/image';
import type { Image as SanityImageType } from 'sanity';
import { urlFor } from '@/sanity/lib/image';

/**
 * Renders a Sanity image, or a branded checkerboard placeholder when absent.
 */
export function SanityImage({
  image,
  alt = '',
  width = 800,
  height = 600,
  className = '',
  sizes,
  fill = false,
  priority = false,
}: {
  image?: SanityImageType & { alt?: string };
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
}) {
  if (!image?.asset) {
    return (
      <div
        className={`relative bg-ink-600 flex items-center justify-center overflow-hidden ${className}`}
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

  const url = urlFor(image)
    .width(width * 2)
    .height(fill ? undefined! : height * 2)
    .fit('crop')
    .auto('format')
    .url();

  if (fill) {
    return (
      <Image
        src={url}
        alt={image.alt || alt}
        fill
        sizes={sizes ?? '100vw'}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={image.alt || alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
