import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Switch, Text } from '@sanity/ui';
import { useClient } from 'sanity';
import { CJENIK, KATEGORIJA_LABEL, PRIJEVOZ_LABEL, type IzletPutnik } from '../../lib/izlet';

const SETTINGS_ID = 'izlet-europapark';
const DATASET = 'prijave';

type Settings = { aktivan?: boolean; naziv?: string } | null;

/** Studio pane for the one-off Europapark check-in: the on/off switch that
 *  disables the public /checkin page, live counters and the CSV export.
 *  Reads/writes the PRIVATE `prijave` dataset via the editor's own session. */
export function IzletPane() {
  const base = useClient({ apiVersion: '2024-10-01' });
  const client = useMemo(() => base.withConfig({ dataset: DATASET }), [base]);

  const [settings, setSettings] = useState<Settings>(null);
  const [putnici, setPutnici] = useState<IzletPutnik[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [s, p] = await Promise.all([
        client.fetch<Settings>(`*[_id == $id][0]{aktivan, naziv}`, { id: SETTINGS_ID }),
        client.fetch<IzletPutnik[]>(
          `*[_type == "izletPutnik"] | order(ime asc){_id, ime, kategorija, prijevoz, placeno, dosao}`,
        ),
      ]);
      setSettings(s);
      setPutnici(p);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [client]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleAktivan = useCallback(async () => {
    if (!settings) return;
    setBusy(true);
    try {
      await client.patch(SETTINGS_ID).set({ aktivan: !settings.aktivan }).commit();
      setSettings({ ...settings, aktivan: !settings.aktivan });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [client, settings]);

  const exportCsv = useCallback(() => {
    if (!putnici) return;
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = [
      ['Ime', 'Kategorija', 'Prijevoz', 'Iznos CHF', 'Placeno', 'Dosao'],
      ...putnici.map((p) => [
        p.ime,
        KATEGORIJA_LABEL[p.kategorija] ?? p.kategorija,
        PRIJEVOZ_LABEL[p.prijevoz] ?? p.prijevoz,
        String(CJENIK[p.kategorija] ?? 0),
        p.placeno ? 'da' : 'ne',
        p.dosao ? 'da' : 'ne',
      ]),
    ];
    // ﻿ BOM + semicolons → Excel opens č/ć/ž/š/đ correctly.
    const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'europapark-checkin.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [putnici]);

  if (error) {
    return (
      <Box padding={4}>
        <Card padding={4} radius={2} tone="critical">
          <Stack space={3}>
            <Text weight="semibold">Ne mogu dohvatiti podatke izleta</Text>
            <Text size={1} muted>
              Najvjerojatnije privatni dataset «{DATASET}» još ne postoji ili nemaš pristup. Detalj: {error}
            </Text>
            <Box><Button text="Pokušaj ponovo" mode="ghost" onClick={reload} /></Box>
          </Stack>
        </Card>
      </Box>
    );
  }

  if (!putnici) {
    return (
      <Flex align="center" justify="center" padding={6}>
        <Spinner muted />
      </Flex>
    );
  }

  const doslo = putnici.filter((p) => p.dosao).length;
  const unpaid = putnici.filter((p) => !p.placeno && CJENIK[p.kategorija] > 0);
  const unpaidSum = unpaid.reduce((s, p) => s + CJENIK[p.kategorija], 0);

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Card padding={4} radius={2} shadow={1}>
          <Flex align="center" justify="space-between">
            <Stack space={2}>
              <Text weight="semibold">Izlet aktivan</Text>
              <Text size={1} muted>
                Kad je isključeno, stranica /checkin prestaje raditi (i čitanje i upisi).
              </Text>
            </Stack>
            <Flex align="center" gap={3}>
              <Badge tone={settings?.aktivan ? 'positive' : 'critical'}>
                {settings?.aktivan ? 'AKTIVAN' : 'ZAKLJUČEN'}
              </Badge>
              <Switch checked={Boolean(settings?.aktivan)} onChange={toggleAktivan} disabled={busy || !settings} />
            </Flex>
          </Flex>
        </Card>

        <Card padding={4} radius={2} shadow={1}>
          <Flex gap={4} wrap="wrap">
            <Stat label="Putnika" value={String(putnici.length)} />
            <Stat label="Došlo" value={`${doslo}/${putnici.length}`} />
            <Stat label="Nenaplaćeno" value={`${unpaidSum} CHF (${unpaid.length})`} />
          </Flex>
        </Card>

        <Flex gap={2}>
          <Button text="Export CSV" tone="primary" onClick={exportCsv} disabled={putnici.length === 0} />
          <Button text="Osvježi" mode="ghost" onClick={reload} />
        </Flex>

        <Text size={1} muted>
          Check-in se vodi na stranici /checkin?kod=… (tajni link). Podaci su u privatnom datasetu «{DATASET}».
        </Text>
      </Stack>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack space={2}>
      <Text size={1} muted>{label}</Text>
      <Text size={3} weight="bold">{value}</Text>
    </Stack>
  );
}
