import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { serverClient, serverClientConfigured } from '@/sanity/lib/serverClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTACT_TO = process.env.CONTACT_TO || 'info@kroatien-schwyz.ch';
const FROM = 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>';
const PROD_ORIGIN = 'https://kroatien-schwyz.vercel.app';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Simple in-memory rate limit: max 5 registrations / 10 min per IP.
const hits = new Map<string, number[]>();
function rateLimited(ip: string, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // memory guard
  return false;
}

const EVENT_QUERY = `*[_type == "dogadjaj" && slug.current == $slug][0]{
  _id, "naslovHr": name.hr, "naslovDe": name.de, "slug": slug.current,
  kotizacija, vrstaPrijave, pristupPrijavi, prijaveOtvorene, rokPrijave, tajniKod,
  datumPocetak
}`;

type EventDoc = {
  _id: string;
  naslovHr?: string;
  naslovDe?: string;
  slug: string;
  kotizacija?: string;
  vrstaPrijave?: string;
  pristupPrijavi?: string;
  prijaveOtvorene?: boolean;
  rokPrijave?: string;
  tajniKod?: string;
  datumPocetak?: string;
};

function accessAllowed(ev: EventDoc, kod: string | null) {
  if (ev.pristupPrijavi !== 'clanovi') return true;
  return Boolean(ev.tajniKod && kod && kod === ev.tajniKod);
}

function registrationOpen(ev: EventDoc) {
  if (!ev.prijaveOtvorene) return false;
  if (ev.rokPrijave && new Date(ev.rokPrijave).getTime() < Date.now()) return false;
  return true;
}

/** GET /api/prijava?slug=…&kod=… — validates the member code (never returns it). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  const kod = url.searchParams.get('kod');
  if (!slug || !serverClientConfigured) return NextResponse.json({ valid: false });
  try {
    const ev = await serverClient.fetch<EventDoc | null>(EVENT_QUERY, { slug });
    if (!ev) return NextResponse.json({ valid: false });
    return NextResponse.json({ valid: accessAllowed(ev, kod) });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Honeypot — pretend success so bots move on.
  if (body?.company) return NextResponse.json({ ok: true });

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const type = body?.type === 'ekipa' ? 'ekipa' : body?.type === 'osoba' ? 'osoba' : null;
  const slug = String(body?.slug ?? '').trim();
  const kod = body?.kod ? String(body.kod).trim() : null;
  const locale = body?.locale === 'de' ? 'de' : 'hr';
  const email = String(body?.email ?? '').trim();
  const telefon = String(body?.telefon ?? '').trim().slice(0, 60);

  if (!type || !slug || !emailRe.test(email)) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }

  let fields: Record<string, unknown>;
  let naslovPrijave: string; // who registered, for emails
  if (type === 'osoba') {
    const ime = String(body?.ime ?? '').trim().slice(0, 80);
    const prezime = String(body?.prezime ?? '').trim().slice(0, 80);
    const brojOsoba = Math.min(50, Math.max(1, Math.round(Number(body?.brojOsoba) || 1)));
    const napomena = String(body?.napomena ?? '').trim().slice(0, 1000);
    if (!ime || !prezime) return NextResponse.json({ error: 'validation' }, { status: 422 });
    fields = { ime, prezime, email, telefon, brojOsoba, ...(napomena ? { napomena } : {}) };
    naslovPrijave = `${ime} ${prezime}${brojOsoba > 1 ? ` (${brojOsoba} osoba)` : ''}`;
  } else {
    const nazivEkipe = String(body?.nazivEkipe ?? '').trim().slice(0, 120);
    const kontaktOsoba = String(body?.kontaktOsoba ?? '').trim().slice(0, 120);
    if (!nazivEkipe || !kontaktOsoba) return NextResponse.json({ error: 'validation' }, { status: 422 });
    fields = { nazivEkipe, kontaktOsoba, email, telefon };
    naslovPrijave = nazivEkipe;
  }

  if (!serverClientConfigured) {
    console.error('[prijava] SANITY_WRITE_TOKEN missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  let ev: EventDoc | null;
  try {
    ev = await serverClient.fetch<EventDoc | null>(EVENT_QUERY, { slug });
  } catch (e) {
    console.error('[prijava] sanity fetch failed:', e);
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }
  if (!ev) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (ev.vrstaPrijave !== type) return NextResponse.json({ error: 'wrong_type' }, { status: 422 });
  if (!registrationOpen(ev)) return NextResponse.json({ error: 'closed' }, { status: 409 });
  if (!accessAllowed(ev, kod)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const otkazniToken = randomBytes(24).toString('base64url');
  const now = new Date().toISOString();

  let createdId: string;
  try {
    const created = await serverClient.create({
      _type: type === 'osoba' ? 'prijavaOsoba' : 'prijavaEkipa',
      dogadjaj: { _type: 'reference', _ref: ev._id },
      ...fields,
      statusPlacanja: 'neplaceno',
      datumPrijave: now,
      otkazana: false,
      otkazniToken,
    });
    createdId = created._id;
  } catch (e) {
    console.error('[prijava] sanity create failed:', e);
    return NextResponse.json({ error: 'store_failed' }, { status: 502 });
  }

  // Emails — the registration is already stored; email failure won't undo it.
  const apiKey = process.env.RESEND_API_KEY;
  let emailOk = false;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const naslovEventa = (locale === 'de' ? ev.naslovDe : ev.naslovHr) || ev.naslovHr || ev.slug;
    const reqOrigin = req.headers.get('origin') ?? '';
    const origin = reqOrigin.startsWith('http://localhost') ? reqOrigin : PROD_ORIGIN;
    const cancelUrl = `${origin}/${locale}/otkazi-prijavu?token=${otkazniToken}`;

    const detailRows = Object.entries({
      'Događaj': naslovEventa,
      ...(type === 'osoba'
        ? { 'Ime i prezime': `${fields.ime} ${fields.prezime}`, 'Broj osoba': String(fields.brojOsoba) }
        : { 'Naziv ekipe': String(fields.nazivEkipe), 'Kontakt osoba': String(fields.kontaktOsoba) }),
      'E-mail': email,
      ...(telefon ? { Telefon: telefon } : {}),
      ...(fields.napomena ? { Napomena: String(fields.napomena) } : {}),
      ...(ev.kotizacija ? { Kotizacija: ev.kotizacija } : {}),
    })
      .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#666;white-space:nowrap">${esc(k)}:</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
      .join('');

    // a) notification to the club — every registration, immediately
    const notif = resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: email,
      subject: `Nova prijava · ${naslovPrijave} · ${naslovEventa}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
        <p><strong>Nova prijava na događaj</strong> (${type === 'osoba' ? 'osoba' : 'ekipa'})</p>
        <table style="border-collapse:collapse;font-size:15px">${detailRows}</table>
      </div>`,
    });

    // b) confirmation to the submitter, with the cancellation link
    const hr = locale === 'hr';
    const conf = resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CONTACT_TO,
      subject: hr
        ? `Potvrda prijave — ${naslovEventa}`
        : `Anmeldebestätigung — ${naslovEventa}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.55">
        <p>${hr ? 'Pozdrav' : 'Hallo'} ${esc(type === 'osoba' ? String(fields.ime) : String(fields.kontaktOsoba))},</p>
        <p>${hr
          ? `zaprimili smo vašu prijavu na događaj <strong>${esc(naslovEventa)}</strong>.`
          : `wir haben Ihre Anmeldung für <strong>${esc(naslovEventa)}</strong> erhalten.`}</p>
        <table style="border-collapse:collapse;font-size:15px">${detailRows}</table>
        ${ev.kotizacija ? `<p>${hr
          ? `Kotizacija iznosi <strong>${esc(ev.kotizacija)}</strong> — informacije o plaćanju dobit ćete od organizatora.`
          : `Das Startgeld beträgt <strong>${esc(ev.kotizacija)}</strong> — Angaben zur Zahlung erhalten Sie vom Organisator.`}</p>` : ''}
        <p>${hr
          ? `Ako ne možete doći, prijavu možete otkazati ovdje:`
          : `Falls Sie nicht teilnehmen können, können Sie Ihre Anmeldung hier stornieren:`}<br>
        <a href="${cancelUrl}">${cancelUrl}</a></p>
        <p>${hr ? 'Sportski pozdrav' : 'Sportliche Grüsse'},<br>HNK Kroatien Schwyz</p>
      </div>`,
    });

    try {
      const [n, c] = await Promise.all([notif, conf]);
      if (n.error) console.error('[prijava] notif error:', n.error);
      if (c.error) console.error('[prijava] conf error:', c.error);
      emailOk = !n.error && !c.error;
    } catch (e) {
      console.error('[prijava] resend exception:', e);
    }
  } else {
    console.error('[prijava] RESEND_API_KEY missing');
  }

  return NextResponse.json({ ok: true, id: createdId, emailOk });
}
