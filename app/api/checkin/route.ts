import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-off Europapark check-in API. All reads/writes go to the PRIVATE
 * `prijave` dataset (override with IZLET_DATASET for local testing only).
 * Access is gated by the secret code stored on the izlet-europapark settings
 * document — no code, no data. The write token never leaves the server.
 */
const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'jxoy4fyb';
const DATASET = process.env.IZLET_DATASET || 'prijave';
const TOKEN = process.env.SANITY_WRITE_TOKEN;
const API = `https://${PROJECT}.api.sanity.io/v2024-01-01/data`;

const KATEGORIJE = ['odrasli', 'mladi', 'djeca'];
const PRIJEVOZI = ['bus', 'privat'];
const SETTINGS_ID = 'izlet-europapark';

async function sanityQuery<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(`${API}/query/${DATASET}`);
  url.searchParams.set('query', query);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`sanity_query_${res.status}`);
  return (await res.json()).result as T;
}

async function sanityMutate(mutations: unknown[]) {
  const res = await fetch(`${API}/mutate/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`sanity_mutate_${res.status}`);
  return res.json();
}

type Settings = { aktivan?: boolean; kod?: string; naziv?: string } | null;

async function loadSettings(): Promise<Settings> {
  return sanityQuery<Settings>(`*[_id == $id][0]{aktivan, kod, naziv}`, { id: SETTINGS_ID });
}

const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 });

export async function GET(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'config' }, { status: 500 });
  const kod = new URL(req.url).searchParams.get('kod') ?? '';
  try {
    const settings = await loadSettings();
    if (!settings?.kod || kod !== settings.kod) return notFound();
    if (!settings.aktivan) return NextResponse.json({ aktivan: false, naziv: settings.naziv ?? '' });
    const putnici = await sanityQuery<unknown[]>(
      `*[_type == "izletPutnik"] | order(ime asc){_id, ime, kategorija, prijevoz, placeno, dosao}`,
    );
    return NextResponse.json({ aktivan: true, naziv: settings.naziv ?? '', putnici });
  } catch (e) {
    // Dataset missing or Sanity unreachable — same opaque answer as a bad code.
    console.error('[checkin] GET failed:', (e as Error).message);
    return notFound();
  }
}

export async function POST(req: Request) {
  if (!TOKEN) return NextResponse.json({ error: 'config' }, { status: 500 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const settings = await loadSettings();
    if (!settings?.kod || body?.kod !== settings.kod) return notFound();
    if (!settings.aktivan) return NextResponse.json({ error: 'closed' }, { status: 409 });

    const op = String(body?.op ?? '');

    if (op === 'set') {
      const id = String(body?.id ?? '');
      if (!/^putnik-[a-z0-9-]+$/i.test(id)) return NextResponse.json({ error: 'validation' }, { status: 422 });
      const p = body?.patch ?? {};
      const set: Record<string, unknown> = {};
      if (typeof p.ime === 'string' && p.ime.trim() && p.ime.trim().length <= 80) set.ime = p.ime.trim();
      if (KATEGORIJE.includes(p.kategorija)) set.kategorija = p.kategorija;
      if (PRIJEVOZI.includes(p.prijevoz)) set.prijevoz = p.prijevoz;
      if (typeof p.placeno === 'boolean') set.placeno = p.placeno;
      if (typeof p.dosao === 'boolean') {
        set.dosao = p.dosao;
        set.dosaoAt = p.dosao ? new Date().toISOString() : null;
      }
      if (Object.keys(set).length === 0) return NextResponse.json({ error: 'validation' }, { status: 422 });
      await sanityMutate([{ patch: { id, set } }]);
      return NextResponse.json({ ok: true });
    }

    if (op === 'add') {
      const d = body?.doc ?? {};
      const id = String(d?._id ?? '');
      const ime = String(d?.ime ?? '').trim();
      if (
        !/^putnik-c-[a-z0-9-]+$/i.test(id) ||
        !ime || ime.length > 80 ||
        !KATEGORIJE.includes(d.kategorija) ||
        !PRIJEVOZI.includes(d.prijevoz)
      ) {
        return NextResponse.json({ error: 'validation' }, { status: 422 });
      }
      // createIfNotExists + a client-generated id → safe to retry on flaky
      // network without creating duplicates.
      await sanityMutate([
        {
          createIfNotExists: {
            _id: id,
            _type: 'izletPutnik',
            ime,
            kategorija: d.kategorija,
            prijevoz: d.prijevoz,
            placeno: Boolean(d.placeno),
            dosao: false,
          },
        },
      ]);
      return NextResponse.json({ ok: true });
    }

    if (op === 'delete') {
      const id = String(body?.id ?? '');
      if (!/^putnik-[a-z0-9-]+$/i.test(id)) return NextResponse.json({ error: 'validation' }, { status: 422 });
      await sanityMutate([{ delete: { id } }]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  } catch (e) {
    console.error('[checkin] POST failed:', (e as Error).message);
    return NextResponse.json({ error: 'server' }, { status: 502 });
  }
}
