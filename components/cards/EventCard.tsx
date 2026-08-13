import { Link } from '@/i18n/navigation';
import { SanityImage } from '@/components/ui/SanityImage';
import { EventCountdown } from '@/components/EventCountdown';
import { pickLocale, formatDate } from '@/lib/locale';
import type { Dogadjaj } from '@/sanity/lib/types';

export function EventCard({
  dogadjaj,
  locale,
  showCountdown = true,
}: {
  dogadjaj: Dogadjaj;
  locale: string;
  showCountdown?: boolean;
}) {
  const name = pickLocale(dogadjaj.name, locale);

  return (
    <Link
      href={`/dogadjaji/${dogadjaj.slug}`}
      className="card card-hover group flex flex-col md:flex-row"
    >
      <div className="relative md:w-64 aspect-[16/10] md:aspect-auto overflow-hidden flex-shrink-0">
        <SanityImage
          image={dogadjaj.coverImage}
          alt={name}
          fill
          sizes="(max-width:768px) 100vw, 256px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
          <time className="text-croatia">
            {formatDate(dogadjaj.date, locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {dogadjaj.location && <span>· {dogadjaj.location}</span>}
        </div>
        <h3 className="h-display text-2xl leading-tight text-content group-hover:text-croatia transition-colors">
          {name}
        </h3>
        {showCountdown && (
          <div className="mt-auto pt-2">
            <EventCountdown date={dogadjaj.date} size="sm" />
          </div>
        )}
      </div>
    </Link>
  );
}
