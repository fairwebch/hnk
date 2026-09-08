import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * TEST MIGRACIJA: tanki proxy na PHP endpoint hostpoint-cms/public/api/prijava.php.
 * Prijave (osobni podaci) više ne idu u Sanity nego u ZASEBNU privatnu MySQL
 * bazu na Hostpointu; validacija, honeypot, rate limit, e-mailovi (Resend) i
 * otkazni token žive u PHP-u. Ovdje se samo prosljeđuje tijelo + klijentski
 * IP (X-Forwarded-For, za rate limit) i vraća isti status/JSON, pa
 * components/EventRegistration.tsx ostaje nepromijenjen osim checkboxa privole.
 */
const PRIJAVA_API_BASE_URL =
  process.env.PRIJAVA_API_BASE_URL || 'https://api-staging.kroatien-schwyz.ch';

function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
}

async function passthrough(res: Response) {
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** GET /api/prijava?slug=…&kod=… — validacija članskog koda (kod se nikad ne vraća). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  const kod = url.searchParams.get('kod') ?? '';
  if (!slug) return NextResponse.json({ valid: false });
  try {
    const res = await fetch(
      `${PRIJAVA_API_BASE_URL}/api/prijava.php?slug=${encodeURIComponent(slug)}&kod=${encodeURIComponent(kod)}`,
      { cache: 'no-store' },
    );
    return passthrough(res);
  } catch {
    return NextResponse.json({ valid: false });
  }
}

export async function POST(req: Request) {
  let body: string;
  try {
    body = JSON.stringify(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  try {
    const res = await fetch(`${PRIJAVA_API_BASE_URL}/api/prijava.php`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': clientIp(req) },
      body,
      cache: 'no-store',
    });
    return passthrough(res);
  } catch (e) {
    console.error('[prijava proxy] upstream failed:', e);
    return NextResponse.json({ error: 'config' }, { status: 502 });
  }
}
