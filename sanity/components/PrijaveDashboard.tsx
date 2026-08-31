import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Card, Flex, Grid, Spinner, Stack, Text } from '@sanity/ui';
import { useClient } from 'sanity';

/**
 * Custom Studio pane: per-event registration dashboard (stats, paid/unpaid
 * donut, newest-first list with a quick payment toggle, CSV export).
 * Mounted from structure.ts with options({ eventId }).
 */

type Prijava = {
  _id: string;
  _type: 'prijavaOsoba' | 'prijavaEkipa';
  ime?: string;
  prezime?: string;
  nazivEkipe?: string;
  kontaktOsoba?: string;
  email?: string;
  telefon?: string;
  brojOsoba?: number;
  napomena?: string;
  statusPlacanja?: string;
  datumPrijave?: string;
  otkazana?: boolean;
  datumOtkaza?: string;
};

type EventInfo = {
  _id: string;
  naslov?: string;
  slug?: string;
  kotizacija?: string;
  vrstaPrijave?: string;
};

const API_VERSION = '2024-10-01';

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('hr-HR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

/** First number in the kotizacija string, e.g. "20 CHF po ekipi" → 20. */
const parseIznos = (s?: string): number | null => {
  const m = s?.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
};

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function PrijaveDashboard(props: { options?: { eventId?: string } } & Record<string, unknown>) {
  const rawId = props?.options?.eventId ?? '';
  const eventId = rawId.replace(/^drafts\./, '');
  const client = useClient({ apiVersion: API_VERSION });

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [prijave, setPrijave] = useState<Prijava[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ev, list] = await Promise.all([
        client.fetch<EventInfo | null>(
          `coalesce(
            *[_id == $id][0],
            *[_id == "drafts." + $id][0]
          ){ _id, "naslov": name.hr, "slug": slug.current, kotizacija, vrstaPrijave }`,
          { id: eventId },
        ),
        client.fetch<Prijava[]>(
          `*[_type in ["prijavaOsoba","prijavaEkipa"] && dogadjaj._ref == $id]
            | order(datumPrijave desc){
            _id, _type, ime, prezime, nazivEkipe, kontaktOsoba, email, telefon,
            brojOsoba, napomena, statusPlacanja, datumPrijave, otkazana, datumOtkaza
          }`,
          { id: eventId },
        ),
      ]);
      setEvent(ev);
      setPrijave(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [client, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const list = prijave ?? [];
    const aktivne = list.filter((p) => !p.otkazana);
    const otkazane = list.length - aktivne.length;
    const placene = aktivne.filter((p) => p.statusPlacanja === 'placeno');
    const osobe = aktivne.reduce((n, p) => n + (p.brojOsoba || 1), 0);
    const unit = parseIznos(event?.kotizacija);
    const jePoOsobi = event?.vrstaPrijave === 'osoba';
    const iznos = (p: Prijava) => (unit == null ? 0 : unit * (jePoOsobi ? p.brojOsoba || 1 : 1));
    return {
      aktivne,
      otkazane,
      placeneN: placene.length,
      neplaceneN: aktivne.length - placene.length,
      osobe,
      unit,
      ocekivano: aktivne.reduce((s, p) => s + iznos(p), 0),
      placeno: placene.reduce((s, p) => s + iznos(p), 0),
    };
  }, [prijave, event]);

  const togglePlacanje = useCallback(
    async (p: Prijava) => {
      const next = p.statusPlacanja === 'placeno' ? 'neplaceno' : 'placeno';
      setBusy(p._id);
      try {
        await client.patch(p._id).set({ statusPlacanja: next }).commit();
        setPrijave((cur) => cur?.map((x) => (x._id === p._id ? { ...x, statusPlacanja: next } : x)) ?? null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [client],
  );

  const exportCsv = useCallback(() => {
    const list = prijave ?? [];
    const header = [
      'Tip', 'Ime / Naziv ekipe', 'Prezime / Kontakt osoba', 'E-mail', 'Telefon',
      'Broj osoba', 'Napomena', 'Status plaćanja', 'Datum prijave', 'Otkazana', 'Datum otkaza',
    ];
    const rows = list.map((p) => [
      p._type === 'prijavaOsoba' ? 'Osoba' : 'Ekipa',
      p._type === 'prijavaOsoba' ? p.ime : p.nazivEkipe,
      p._type === 'prijavaOsoba' ? p.prezime : p.kontaktOsoba,
      p.email, p.telefon,
      p._type === 'prijavaOsoba' ? p.brojOsoba || 1 : '',
      p.napomena,
      p.otkazana ? '' : p.statusPlacanja === 'placeno' ? 'Plaćeno' : 'Neplaćeno',
      fmt(p.datumPrijave),
      p.otkazana ? 'DA' : 'NE',
      p.otkazana ? fmt(p.datumOtkaza) : '',
    ]);
    // UTF-8 BOM + semicolons so Excel opens čćžšđ correctly out of the box.
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prijave-${event?.slug ?? eventId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [prijave, event, eventId]);

  if (error) {
    return (
      <Card padding={4} tone="critical">
        <Text size={1}>Greška: {error}</Text>
      </Card>
    );
  }
  if (!prijave) {
    return (
      <Flex align="center" justify="center" padding={6}>
        <Spinner muted />
      </Flex>
    );
  }

  const donutTotal = stats.placeneN + stats.neplaceneN;
  const pct = donutTotal ? Math.round((stats.placeneN / donutTotal) * 100) : 0;
  const R = 40;
  const C = 2 * Math.PI * R;

  return (
    <Box padding={4} style={{ maxWidth: 860, margin: '0 auto' }}>
      <Stack space={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Stack space={2}>
            <Text size={3} weight="bold">{event?.naslov ?? 'Događaj'}</Text>
            <Text size={1} muted>
              {event?.vrstaPrijave === 'ekipa' ? 'Prijave ekipa' : 'Prijave osoba'}
              {event?.kotizacija ? ` · Kotizacija: ${event.kotizacija}` : ''}
            </Text>
          </Stack>
          <Flex gap={2}>
            <Button mode="ghost" text="Osvježi" onClick={load} />
            <Button tone="primary" text="Export CSV" onClick={exportCsv} disabled={!prijave.length} />
          </Flex>
        </Flex>

        {/* Stats + donut */}
        <Card padding={4} radius={3} shadow={1}>
          <Flex align="center" gap={5} wrap="wrap">
            <svg width="120" height="120" viewBox="0 0 100 100" role="img" aria-label={`${pct}% plaćeno`}>
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--card-border-color, #e3e4e8)" strokeWidth="12" />
              {donutTotal > 0 && (
                <circle
                  cx="50" cy="50" r={R} fill="none" stroke="#43d675" strokeWidth="12"
                  strokeDasharray={`${(stats.placeneN / donutTotal) * C} ${C}`}
                  strokeLinecap={stats.placeneN > 0 && stats.placeneN < donutTotal ? 'round' : 'butt'}
                  transform="rotate(-90 50 50)"
                />
              )}
              <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor">{pct}%</text>
              <text x="50" y="63" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".6">plaćeno</text>
            </svg>

            <Grid columns={[2, 2, 4]} gap={4} flex={1} style={{ minWidth: 260 }}>
              <Stat label="Ukupno prijava" value={String(stats.aktivne.length)} />
              {event?.vrstaPrijave === 'osoba' && <Stat label="Ukupno osoba" value={String(stats.osobe)} />}
              <Stat label="Plaćeno / neplaćeno" value={`${stats.placeneN} / ${stats.neplaceneN}`} />
              {stats.unit != null && (
                <Stat label="Uplaćeno / očekivano" value={`${stats.placeno} / ${stats.ocekivano} CHF`} />
              )}
              <Stat label="Otkazane" value={String(stats.otkazane)} />
            </Grid>
          </Flex>
        </Card>

        {/* List, newest first */}
        {prijave.length === 0 ? (
          <Card padding={5} radius={3} tone="transparent" border>
            <Text size={1} muted align="center">Još nema prijava za ovaj događaj.</Text>
          </Card>
        ) : (
          <Stack space={2}>
            {prijave.map((p) => {
              const naziv = p._type === 'prijavaOsoba'
                ? `${p.ime ?? ''} ${p.prezime ?? ''}`.trim()
                : p.nazivEkipe ?? '—';
              const kontakt = [
                p._type === 'prijavaEkipa' ? p.kontaktOsoba : null,
                p.email,
                p.telefon,
              ].filter(Boolean).join(' · ');
              const placeno = p.statusPlacanja === 'placeno';
              return (
                <Card key={p._id} padding={3} radius={3} border tone={p.otkazana ? 'transparent' : 'default'}>
                  <Flex align="center" gap={3} wrap="wrap">
                    <Stack space={2} flex={1} style={{ minWidth: 220, opacity: p.otkazana ? 0.55 : 1 }}>
                      <Flex align="center" gap={2} wrap="wrap">
                        <Text size={2} weight="semibold" style={p.otkazana ? { textDecoration: 'line-through' } : undefined}>
                          {naziv}
                        </Text>
                        {p._type === 'prijavaOsoba' && (p.brojOsoba || 1) > 1 && (
                          <Badge tone="primary" fontSize={0}>{p.brojOsoba} osoba</Badge>
                        )}
                        {p.otkazana ? (
                          <Badge tone="critical" fontSize={0}>Otkazana {p.datumOtkaza ? fmt(p.datumOtkaza) : ''}</Badge>
                        ) : (
                          <Badge tone={placeno ? 'positive' : 'caution'} fontSize={0}>
                            {placeno ? 'Plaćeno' : 'Neplaćeno'}
                          </Badge>
                        )}
                      </Flex>
                      <Text size={1} muted>{kontakt || '—'}</Text>
                      {p.napomena && <Text size={1} muted style={{ fontStyle: 'italic' }}>„{p.napomena}“</Text>}
                      <Text size={0} muted>Prijavljeno: {fmt(p.datumPrijave)}</Text>
                    </Stack>
                    {!p.otkazana && (
                      <Button
                        mode="ghost"
                        tone={placeno ? 'caution' : 'positive'}
                        fontSize={1}
                        text={placeno ? 'Označi neplaćeno' : 'Označi plaćeno'}
                        loading={busy === p._id}
                        onClick={() => togglePlacanje(p)}
                      />
                    )}
                  </Flex>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack space={2}>
      <Text size={0} muted style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</Text>
      <Text size={3} weight="bold">{value}</Text>
    </Stack>
  );
}
