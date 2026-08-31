'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CJENIK,
  KATEGORIJA_LABEL,
  PRIJEVOZ_LABEL,
  type IzletKategorija,
  type IzletPrijevoz,
  type IzletPutnik,
} from '@/lib/izlet';

/**
 * Mobile-first check-in for the Europapark trip. Optimistic UI: every change
 * applies instantly and goes into a persistent op queue that retries in the
 * background — flaky network at the bus must never lose a check-in.
 */

type OpBody =
  | { op: 'set'; id: string; patch: Partial<Pick<IzletPutnik, 'ime' | 'kategorija' | 'prijevoz' | 'placeno' | 'dosao'>> }
  | { op: 'add'; doc: { _id: string; ime: string; kategorija: IzletKategorija; prijevoz: IzletPrijevoz; placeno: boolean } }
  | { op: 'delete'; id: string };

type Op = { opId: string; body: OpBody };
type Load = 'loading' | 'ok' | 'invalid' | 'closed' | 'error';
type Filter = 'svi' | 'nedosli' | 'dosli' | 'neplaceni';

const LSKEY = 'ep-checkin-queue-v1';

const loadLS = (): Op[] => {
  try {
    return JSON.parse(localStorage.getItem(LSKEY) || '[]');
  } catch {
    return [];
  }
};
const saveLS = (ops: Op[]) => {
  try {
    localStorage.setItem(LSKEY, JSON.stringify(ops));
  } catch {
    /* ignore */
  }
};

function applyOp(list: IzletPutnik[], body: OpBody): IzletPutnik[] {
  if (body.op === 'set') return list.map((p) => (p._id === body.id ? { ...p, ...body.patch } : p));
  if (body.op === 'add') return [...list, { ...body.doc, dosao: false }];
  return list.filter((p) => p._id !== body.id);
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const KATEGORIJE: IzletKategorija[] = ['odrasli', 'mladi', 'djeca'];
const PRIJEVOZI: IzletPrijevoz[] = ['bus', 'privat'];

export function CheckinTool() {
  const kod = useSearchParams().get('kod') ?? '';
  const [load, setLoad] = useState<Load>('loading');
  const [naziv, setNaziv] = useState('Europapark');
  const [putnici, setPutnici] = useState<IzletPutnik[]>([]);
  const [filter, setFilter] = useState<Filter>('svi');
  const [search, setSearch] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState(false);
  const [sheet, setSheet] = useState<{ mode: 'edit'; p: IzletPutnik } | { mode: 'add' } | null>(null);

  const opsRef = useRef<Op[]>([]);
  const loadRef = useRef<Load>('loading');
  loadRef.current = load;
  const kick = useRef<() => void>(() => {});

  const syncOps = useCallback(() => {
    saveLS(opsRef.current);
    setPendingCount(opsRef.current.length);
    const ids = new Set<string>();
    for (const o of opsRef.current) {
      if (o.body.op === 'add') ids.add(o.body.doc._id);
      else ids.add(o.body.id);
    }
    setPendingIds(ids);
  }, []);

  const dispatchOp = useCallback(
    (body: OpBody) => {
      setPutnici((l) => applyOp(l, body));
      opsRef.current.push({ opId: crypto.randomUUID(), body });
      syncOps();
      kick.current();
    },
    [syncOps],
  );

  // Initial load: server state + replay of any queued (unsaved) local ops.
  useEffect(() => {
    if (!kod) {
      setLoad('invalid');
      return;
    }
    let alive = true;
    const fetchState = async () => {
      try {
        const r = await fetch(`/api/checkin?kod=${encodeURIComponent(kod)}`, { cache: 'no-store' });
        if (!alive) return;
        if (r.status === 404) {
          setLoad('invalid');
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        const data = await r.json();
        if (data.naziv) setNaziv(data.naziv);
        if (!data.aktivan) {
          setLoad('closed');
          return;
        }
        opsRef.current = loadLS();
        let list: IzletPutnik[] = data.putnici ?? [];
        for (const o of opsRef.current) list = applyOp(list, o.body);
        setPutnici(list);
        syncOps();
        setLoad('ok');
        kick.current();
      } catch {
        if (!alive) return;
        setLoad('error');
        setTimeout(fetchState, 4000); // offline at start — keep trying
      }
    };
    fetchState();
    return () => {
      alive = false;
    };
  }, [kod, syncOps]);

  // Background sync loop — lives for the whole component lifetime.
  useEffect(() => {
    let alive = true;
    let attempt = 0;
    const waitKick = () => new Promise<void>((res) => (kick.current = res));
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    (async () => {
      while (alive) {
        const op = opsRef.current[0];
        if (!op || loadRef.current !== 'ok') {
          await waitKick();
          continue;
        }
        try {
          const r = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kod, ...op.body }),
          });
          if (r.ok) {
            attempt = 0;
            setSyncError(false);
            opsRef.current.shift();
            syncOps();
            continue;
          }
          if (r.status === 409) {
            setLoad('closed');
            continue;
          }
          if (r.status >= 400 && r.status < 500) {
            // Permanently invalid op — drop it rather than blocking the queue.
            opsRef.current.shift();
            syncOps();
            continue;
          }
          throw new Error(String(r.status));
        } catch {
          setSyncError(true);
          attempt += 1;
          await sleep(Math.min(15000, 1000 * 2 ** Math.min(attempt, 4)));
        }
      }
    })();
    const onOnline = () => kick.current();
    window.addEventListener('online', onOnline);
    return () => {
      alive = false;
      window.removeEventListener('online', onOnline);
      kick.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kod]);

  const stats = useMemo(() => {
    const total = putnici.length;
    const doslo = putnici.filter((p) => p.dosao).length;
    const by = <K extends string>(keys: K[], get: (p: IzletPutnik) => K) =>
      Object.fromEntries(
        keys.map((k) => [
          k,
          {
            total: putnici.filter((p) => get(p) === k).length,
            doslo: putnici.filter((p) => get(p) === k && p.dosao).length,
          },
        ]),
      ) as Record<K, { total: number; doslo: number }>;
    const unpaid = putnici.filter((p) => !p.placeno && CJENIK[p.kategorija] > 0);
    return {
      total,
      doslo,
      ostalo: total - doslo,
      prijevoz: by(PRIJEVOZI, (p) => p.prijevoz),
      kat: by(KATEGORIJE, (p) => p.kategorija),
      unpaidSum: unpaid.reduce((s, p) => s + CJENIK[p.kategorija], 0),
      unpaidCount: unpaid.length,
    };
  }, [putnici]);

  const visible = useMemo(() => {
    const q = norm(search.trim());
    return [...putnici]
      .filter((p) => {
        if (filter === 'nedosli' && p.dosao) return false;
        if (filter === 'dosli' && !p.dosao) return false;
        if (filter === 'neplaceni' && (p.placeno || CJENIK[p.kategorija] === 0)) return false;
        if (q && !norm(p.ime).includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.ime.localeCompare(b.ime, 'hr'));
  }, [putnici, filter, search]);

  if (load === 'loading') {
    return <Center><p className="text-slateblue-300 font-sans animate-pulse">Učitavam…</p></Center>;
  }
  if (load === 'invalid') {
    return (
      <Center>
        <div className="text-center">
          <div className="h-display text-white text-5xl mb-3">404</div>
          <p className="font-sans text-slateblue-300">Stranica nije pronađena.</p>
        </div>
      </Center>
    );
  }
  if (load === 'closed') {
    return (
      <Center>
        <div className="text-center px-6">
          <div className="h-display text-white text-3xl mb-3">Izlet je zaključen</div>
          <p className="font-sans text-slateblue-300">Check-in više nije aktivan.</p>
        </div>
      </Center>
    );
  }
  if (load === 'error') {
    return (
      <Center>
        <div className="text-center px-6">
          <div className="h-display text-white text-2xl mb-3">Nema veze sa serverom</div>
          <p className="font-sans text-slateblue-300 animate-pulse">Pokušavam ponovo…</p>
        </div>
      </Center>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>
      {/* Sticky header: counters + search + filters */}
      <div className="sticky top-0 z-20 bg-ink-900/97 backdrop-blur border-b border-slateblue-900" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-3">
          <div className="flex items-baseline justify-between">
            <h1 className="h-display text-white text-lg leading-none">
              {naziv} <span className="text-croatia">· Check-in</span>
            </h1>
            {pendingCount > 0 ? (
              <span className={`font-sans text-[11px] font-bold ${syncError ? 'text-red-400' : 'text-amber-400'}`}>
                {syncError ? '⚠ čeka mrežu' : '⟳ sprema se'} ({pendingCount})
              </span>
            ) : (
              <span className="font-sans text-[11px] font-bold text-emerald-400">✓ spremljeno</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-ink-800 border border-slateblue-800 px-3 py-2">
              <div className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400">Došlo</div>
              <div className="h-display text-emerald-400 text-3xl leading-none mt-0.5">
                {stats.doslo}<span className="text-slateblue-500 text-xl">/{stats.total}</span>
              </div>
            </div>
            <div className="bg-ink-800 border border-slateblue-800 px-3 py-2">
              <div className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400">Ostalo</div>
              <div className="h-display text-white text-3xl leading-none mt-0.5">{stats.ostalo}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-sans text-[12px] text-slateblue-300">
            <span>🚌 Bus <b className="text-white">{stats.prijevoz.bus.doslo}/{stats.prijevoz.bus.total}</b></span>
            <span>🚗 Privat <b className="text-white">{stats.prijevoz.privat.doslo}/{stats.prijevoz.privat.total}</b></span>
            <span className="basis-full sm:basis-auto">
              Odrasli <b className="text-white">{stats.kat.odrasli.doslo}/{stats.kat.odrasli.total}</b>
              {' · '}Mladi <b className="text-white">{stats.kat.mladi.doslo}/{stats.kat.mladi.total}</b>
              {' · '}Djeca <b className="text-white">{stats.kat.djeca.doslo}/{stats.kat.djeca.total}</b>
            </span>
          </div>

          <div className="mt-2">
            {stats.unpaidSum > 0 ? (
              <span className="inline-block bg-croatia/15 border border-croatia text-croatia font-display font-bold uppercase tracking-wider2 text-[12px] px-2.5 py-1">
                Za naplatu: {stats.unpaidSum} CHF ({stats.unpaidCount})
              </span>
            ) : (
              <span className="inline-block bg-emerald-500/10 border border-emerald-500 text-emerald-400 font-display font-bold uppercase tracking-wider2 text-[12px] px-2.5 py-1">
                ✓ Sve naplaćeno
              </span>
            )}
          </div>

          <input
            type="search"
            placeholder="Traži po imenu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mt-3 bg-ink-800 border border-slateblue-700 px-3 py-2.5 font-sans text-[15px] text-white placeholder:text-slateblue-500 focus:outline-none focus:border-croatia"
          />

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-2.5 -mx-4 px-4">
            {([
              ['svi', 'Svi'],
              ['nedosli', 'Nije došlo'],
              ['dosli', 'Došlo'],
              ['neplaceni', 'Nije platilo'],
            ] as [Filter, string][]).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 font-display font-bold uppercase tracking-wider2 text-[11px] px-3 py-1.5 border transition-colors ${
                  filter === f ? 'bg-white text-ink-900 border-white' : 'text-slateblue-300 border-slateblue-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-slateblue-900">
        {visible.map((p) => {
          const price = CJENIK[p.kategorija];
          const pending = pendingIds.has(p._id);
          return (
            <li key={p._id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => dispatchOp({ op: 'set', id: p._id, patch: { dosao: !p.dosao } })}
                onKeyDown={(e) => e.key === 'Enter' && dispatchOp({ op: 'set', id: p._id, patch: { dosao: !p.dosao } })}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
                  p.dosao ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : 'border-l-4 border-transparent active:bg-ink-800'
                }`}
              >
                <span
                  aria-hidden
                  className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[15px] font-bold ${
                    p.dosao ? 'bg-emerald-500 border-emerald-500 text-ink-900' : 'border-slateblue-600 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-sans font-semibold text-[15px] leading-tight truncate ${p.dosao ? 'text-emerald-300' : 'text-white'}`}>
                    {p.ime}
                  </span>
                  <span className="block font-sans text-[11px] text-slateblue-400 mt-0.5">
                    {KATEGORIJA_LABEL[p.kategorija]} · {PRIJEVOZ_LABEL[p.prijevoz]}
                    {pending && <span className="text-amber-400"> · nije spremljeno</span>}
                  </span>
                </span>

                {price === 0 ? (
                  <span className="shrink-0 font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-500 border border-slateblue-800 px-2 py-1">
                    gratis
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchOp({ op: 'set', id: p._id, patch: { placeno: !p.placeno } });
                    }}
                    className={`shrink-0 font-display font-bold uppercase text-[11px] tracking-wider2 px-2.5 py-1.5 border transition-colors ${
                      p.placeno
                        ? 'text-emerald-400 border-emerald-600 bg-emerald-500/10'
                        : 'text-white bg-croatia border-croatia'
                    }`}
                  >
                    {p.placeno ? '✓ plać.' : `${price} CHF`}
                  </button>
                )}

                <button
                  type="button"
                  aria-label={`Uredi ${p.ime}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheet({ mode: 'edit', p });
                  }}
                  className="shrink-0 w-9 h-9 flex items-center justify-center border border-slateblue-700 text-slateblue-300 active:border-croatia"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-10 text-center font-sans text-slateblue-400">Nema rezultata.</li>
        )}
      </ul>

      {/* Add button */}
      <button
        type="button"
        onClick={() => setSheet({ mode: 'add' })}
        className="fixed right-4 z-20 btn-cta px-5 py-3.5 shadow-cta"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <span className="text-[14px]">+ Dodaj osobu</span>
      </button>

      {sheet && (
        <EditSheet
          key={sheet.mode === 'edit' ? sheet.p._id : 'add'}
          initial={sheet.mode === 'edit' ? sheet.p : null}
          onClose={() => setSheet(null)}
          onSave={(vals) => {
            if (sheet.mode === 'edit') {
              dispatchOp({ op: 'set', id: sheet.p._id, patch: vals });
            } else {
              dispatchOp({
                op: 'add',
                doc: { _id: `putnik-c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, ...vals },
              });
            }
            setSheet(null);
          }}
          onDelete={
            sheet.mode === 'edit'
              ? () => {
                  dispatchOp({ op: 'delete', id: sheet.p._id });
                  setSheet(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>;
}

function EditSheet({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: IzletPutnik | null;
  onClose: () => void;
  onSave: (v: { ime: string; kategorija: IzletKategorija; prijevoz: IzletPrijevoz; placeno: boolean }) => void;
  onDelete?: () => void;
}) {
  const [ime, setIme] = useState(initial?.ime ?? '');
  const [kategorija, setKategorija] = useState<IzletKategorija>(initial?.kategorija ?? 'odrasli');
  const [prijevoz, setPrijevoz] = useState<IzletPrijevoz>(initial?.prijevoz ?? 'bus');
  const [placeno, setPlaceno] = useState<boolean>(initial?.placeno ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const chip = (active: boolean) =>
    `font-display font-bold uppercase tracking-wider2 text-[12px] px-3.5 py-2 border transition-colors ${
      active ? 'bg-white text-ink-900 border-white' : 'text-slateblue-300 border-slateblue-700'
    }`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Uredi osobu' : 'Dodaj osobu'}
        className="relative w-full max-w-lg bg-ink-800 border-t-2 border-croatia px-4 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <h2 className="h-display text-white text-xl mb-4">{initial ? 'Uredi osobu' : 'Dodaj osobu'}</h2>

        <label className="block font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400 mb-1">Ime</label>
        <input
          value={ime}
          onChange={(e) => setIme(e.target.value)}
          autoFocus={!initial}
          className="w-full bg-ink-900 border border-slateblue-700 px-3 py-2.5 font-sans text-[15px] text-white focus:outline-none focus:border-croatia"
        />

        <div className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400 mt-4 mb-1.5">Kategorija</div>
        <div className="flex gap-1.5">
          {KATEGORIJE.map((k) => (
            <button key={k} type="button" onClick={() => setKategorija(k)} className={chip(kategorija === k)}>
              {KATEGORIJA_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400 mt-4 mb-1.5">Prijevoz</div>
        <div className="flex gap-1.5">
          {PRIJEVOZI.map((v) => (
            <button key={v} type="button" onClick={() => setPrijevoz(v)} className={chip(prijevoz === v)}>
              {PRIJEVOZ_LABEL[v]}
            </button>
          ))}
        </div>

        <div className="font-display font-bold uppercase text-[10px] tracking-wider2 text-slateblue-400 mt-4 mb-1.5">Plaćanje</div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setPlaceno(true)} className={chip(placeno)}>Plaćeno</button>
          <button type="button" onClick={() => setPlaceno(false)} className={chip(!placeno)}>Nije plaćeno</button>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            disabled={!ime.trim()}
            onClick={() => onSave({ ime: ime.trim(), kategorija, prijevoz, placeno })}
            className="btn-cta px-5 py-3 flex-1 justify-center disabled:opacity-50"
          >
            <span className="text-[13px]">Spremi</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 border-2 border-slateblue-700 text-slateblue-300 font-display font-bold uppercase tracking-wider2 text-[12px]"
          >
            Odustani
          </button>
        </div>

        {onDelete && (
          <div className="mt-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="font-sans text-[13px] text-red-400 flex-1">Sigurno obrisati osobu?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 bg-red-600 text-white font-display font-bold uppercase tracking-wider2 text-[11px]"
                >
                  Da, obriši
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 border border-slateblue-700 text-slateblue-300 font-display font-bold uppercase tracking-wider2 text-[11px]"
                >
                  Ne
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full px-4 py-2.5 border border-red-800 text-red-400 font-display font-bold uppercase tracking-wider2 text-[11px]"
              >
                Obriši osobu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
