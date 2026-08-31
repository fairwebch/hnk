import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { serverClient, serverClientConfigured } from '@/sanity/lib/serverClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTACT_TO = process.env.CONTACT_TO || 'info@kroatien-schwyz.ch';
const FROM = 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Light rate limit: 10 attempts / 10 min per IP (tokens are unguessable anyway).
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const token = String(body?.token ?? '').trim();
  if (!token || token.length < 16 || token.length > 64) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  if (!serverClientConfigured) {
    console.error('[otkazi] SANITY_WRITE_TOKEN missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  type Doc = {
    _id: string;
    _type: string;
    otkazana?: boolean;
    ime?: string;
    prezime?: string;
    nazivEkipe?: string;
    email?: string;
    brojOsoba?: number;
    naslovHr?: string;
    naslovDe?: string;
  };

  let doc: Doc | null;
  try {
    doc = await serverClient.fetch<Doc | null>(
      `*[_type in ["prijavaOsoba","prijavaEkipa"] && otkazniToken == $otkazniToken][0]{
        _id, _type, otkazana, ime, prezime, nazivEkipe, email, brojOsoba,
        "naslovHr": dogadjaj->name.hr, "naslovDe": dogadjaj->name.de
      }`,
      { otkazniToken: token },
    );
  } catch (e) {
    console.error('[otkazi] sanity fetch failed:', e);
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const naslov = doc.naslovHr || doc.naslovDe || '';
  const tko = doc._type === 'prijavaOsoba' ? `${doc.ime ?? ''} ${doc.prezime ?? ''}`.trim() : doc.nazivEkipe ?? '';

  if (doc.otkazana) {
    return NextResponse.json({ ok: true, already: true, dogadjaj: naslov });
  }

  try {
    await serverClient
      .patch(doc._id)
      .set({ otkazana: true, datumOtkaza: new Date().toISOString() })
      .commit();
  } catch (e) {
    console.error('[otkazi] patch failed:', e);
    return NextResponse.json({ error: 'store_failed' }, { status: 502 });
  }

  // Notify the club; failure here must not fail the cancellation itself.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const { error } = await new Resend(apiKey).emails.send({
        from: FROM,
        to: [CONTACT_TO],
        ...(doc.email ? { replyTo: doc.email } : {}),
        subject: `Otkazana prijava · ${tko} · ${naslov}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
          <p><strong>Prijava je otkazana.</strong></p>
          <p>Događaj: <strong>${esc(naslov)}</strong><br>
          ${doc._type === 'prijavaOsoba' ? 'Osoba' : 'Ekipa'}: <strong>${esc(tko)}</strong>
          ${doc.brojOsoba && doc.brojOsoba > 1 ? ` (${doc.brojOsoba} osoba)` : ''}<br>
          ${doc.email ? `E-mail: ${esc(doc.email)}` : ''}</p>
        </div>`,
      });
      if (error) console.error('[otkazi] resend error:', error);
    } catch (e) {
      console.error('[otkazi] resend exception:', e);
    }
  }

  return NextResponse.json({ ok: true, dogadjaj: naslov });
}
