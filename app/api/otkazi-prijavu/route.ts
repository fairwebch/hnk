import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * TEST MIGRACIJA: proxy na PHP `api/prijava.php?action=otkazi` (privatna baza
 * prijava na Hostpointu). Ostaje POST-only iza dugmeta u
 * components/CancelRegistration.tsx, pa e-mail skeneri ne mogu otkazati
 * prijavu samim otvaranjem linka.
 */
const PRIJAVA_API_BASE_URL =
  process.env.PRIJAVA_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

export async function POST(req: Request) {
  let body: string;
  try {
    body = JSON.stringify(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const res = await fetch(`${PRIJAVA_API_BASE_URL}/api/prijava.php?action=otkazi`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim(),
      },
      body,
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    console.error('[otkazi proxy] upstream failed:', e);
    return NextResponse.json({ error: 'config' }, { status: 502 });
  }
}
