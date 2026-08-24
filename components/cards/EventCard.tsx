import { Card, cardImage, cardTitle } from '@/components/ui/Card';
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
    <Card
      variant="content"
      href={`/dogadjaji/${dogadjaj.slug}`}
      className="flex flex-col md:flex-row"
    >
      <div className="relative md:w-64 aspect-[16/10] md:aspect-auto overflow-hidden flex-shrink-0">
        <SanityImage
          image={dogadjaj.coverImage}
          alt={name}
          fill
          sizes="(max-width:768px) 100vw, 256px"
          className={cardImage}
        />
      </div>
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {dogadjaj.kategorija && <span className="chip">{dogadjaj.kategorija}</span>}
          <time className="font-display font-bold uppercase text-[11px] tracking-wider2 text-croatia">
            {formatDate(dogadjaj.datumPocetak, locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {dogadjaj.location && (
            <span className="font-display font-bold uppercase text-[11px] tracking-wider2 text-content-muted">
              · {dogadjaj.location}
            </span>
          )}
        </div>
        <h3 className={`h-display text-2xl leading-tight text-content ${cardTitle}`}>
          {name}
        </h3>
        {showCountdown && (
          <div className="mt-auto pt-2">
            <EventCountdown date={dogadjaj.datumPocetak} size="sm" />
          </div>
        )}
      </div>
    </Card>
  );
}
