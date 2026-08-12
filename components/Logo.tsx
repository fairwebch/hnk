import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export function Logo({
  size = 48,
  variant = 'full',
  className = '',
}: {
  size?: number;
  variant?: 'full' | 'mark';
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-3 flex-shrink-0 ${className}`}
      aria-label="HNK Kroatien Schwyz — početna"
    >
      <Image
        src="/assets/logo.svg"
        alt="HNK Kroatien Schwyz"
        width={size}
        height={size}
        priority
        className="block"
        style={{ width: size, height: size }}
      />
      {variant === 'full' && (
        <span className="leading-none">
          <span className="block font-display font-extrabold italic text-white tracking-[.03em] text-[19px] leading-none">
            HNK KROATIEN
          </span>
          <span className="block font-display font-bold text-slateblue-400 tracking-widest3 text-[10px] leading-none mt-[3px]">
            SCHWYZ · 1995
          </span>
        </span>
      )}
    </Link>
  );
}
