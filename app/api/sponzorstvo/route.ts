import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  CLUB_EMAIL,
  MAX_IZNOS_CHF,
  MIN_IZNOS_CHF,
  formatChf,
  potvrdaSponzoruDe,
  type SponzorPrijava,
} from '@/lib/turnirSponzorstvo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Isti setup kao kontakt / postani-clan: klupski inbox + verificirani pošiljatelj.
const CONTACT_TO = process.env.CONTACT_TO || CLUB_EMAIL;
const FROM = 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const plzRe = /^\d{4,5}$/;
// Slobodan tekst završava u subjectu/tijelu maila — bez kontrolnih znakova
// (nema ubačenih novih redaka) i s ograničenom duljinom.
const clean = (v: unknown, max = 200) =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const textToHtml = (text: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
  text
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('') +
  `</div>`;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Honeypot ("website", jer je "firma" ovdje pravo polje) — botu tihi "uspjeh".
  if (body?.website) return NextResponse.json({ ok: true });

  const iznos = Number(body?.iznos);
  const p: SponzorPrijava = {
    ime: clean(body?.ime),
    prezime: clean(body?.prezime),
    firma: clean(body?.firma),
    ulica: clean(body?.ulica),
    plz: String(body?.plz ?? '').trim(),
    mjesto: clean(body?.mjesto),
    telefon: clean(body?.telefon, 60),
    email: String(body?.email ?? '').trim(),
    iznos,
    racun: body?.racun === 'post' ? 'post' : 'email',
    banner: body?.banner === true,
    flyer: body?.flyer === true,
    ostalo: body?.ostalo === true,
    prijedlog: clean(body?.prijedlog, 500),
    napomena: clean(body?.napomena, 1000),
  };

  if (
    !p.ime || !p.prezime || !p.firma || !p.ulica || !p.mjesto || !p.telefon ||
    !plzRe.test(p.plz) || !emailRe.test(p.email) || p.email.length > 190 ||
    !Number.isInteger(iznos) || iznos < MIN_IZNOS_CHF || iznos > MAX_IZNOS_CHF ||
    (p.ostalo && !p.prijedlog)
  ) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }
  if (body?.privola !== true) {
    return NextResponse.json({ error: 'consent_required' }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[sponzorstvo] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }
  const resend = new Resend(apiKey);
  const locale = body?.locale === 'de' ? 'de' : 'hr';

  const zauzvrat = [p.banner && 'Banner u dvorani', p.flyer && 'Flyeri na turniru', p.ostalo && 'Ostalo (vidi prijedlog)']
    .filter(Boolean)
    .join(', ');
  const rows: [string, string][] = [
    ['Firma', p.firma],
    ['Kontakt osoba', `${p.ime} ${p.prezime}`],
    ['Adresa', `${p.ulica}, ${p.plz} ${p.mjesto}`],
    ['Telefon', p.telefon],
    ['E-mail', p.email],
    ['Iznos', formatChf(p.iznos)],
    ['Račun', p.racun === 'post' ? 'Poštom' : 'E-mailom (PDF)'],
    ['Zauzvrat', zauzvrat || 'Ništa odabrano'],
    ...(p.ostalo ? ([['Prijedlog', p.prijedlog]] as [string, string][]) : []),
    ...(p.napomena ? ([['Napomena', p.napomena]] as [string, string][]) : []),
    ['Jezik forme', locale === 'de' ? 'Njemački' : 'Hrvatski'],
  ];

  // 1) Obavijest klubu — mora uspjeti.
  let clubId: string | undefined;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: p.email,
      subject: `Sponzorstvo turnira · ${p.firma} · ${formatChf(p.iznos)}`,
      text: `Nova prijava sponzora za malonogometni turnir 2026:\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html:
        `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">` +
        `<p style="margin:0 0 14px"><strong>Nova prijava sponzora za malonogometni turnir 2026</strong></p>` +
        `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">` +
        rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:5px 18px 5px 0;color:#666;white-space:nowrap;vertical-align:top">${esc(k)}</td>` +
              `<td style="padding:5px 0"><strong>${esc(v)}</strong></td></tr>`,
          )
          .join('') +
        `</table></div>`,
    });
    if (error) {
      console.error('[sponzorstvo] resend club error:', error);
      return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    }
    clubId = data?.id;
  } catch (e) {
    console.error('[sponzorstvo] exception (club):', e);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  // 2) Potvrda sponzoru (uvijek njemački). Klub je prijavu već dobio, pa
  //    neuspjeh ovdje samo logiramo (bez duplih obavijesti klubu kod retryja).
  let replyId: string | undefined;
  try {
    const reply = potvrdaSponzoruDe(p);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [p.email],
      replyTo: CONTACT_TO,
      subject: reply.subject,
      text: reply.text,
      html: textToHtml(reply.text),
    });
    if (error) console.error('[sponzorstvo] resend confirmation error:', error);
    replyId = data?.id;
  } catch (e) {
    console.error('[sponzorstvo] exception (confirmation):', e);
  }

  return NextResponse.json({ ok: true, id: clubId, replyId });
}
