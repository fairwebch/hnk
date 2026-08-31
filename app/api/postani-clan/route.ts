import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Same delivery setup as the contact form: club inbox + verified sender.
const CONTACT_TO = process.env.CONTACT_TO || 'info@kroatien-schwyz.ch';
const FROM = 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>';
const CLUB_PHONE = '+41 79 279 72 32';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const plzRe = /^\d{4}$/;
// Free-text fields end up in email subjects/bodies — strip control chars
// (no injected line breaks) and cap the length.
const clean = (v: unknown) =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type Gender = 'm' | 'f';

function autoReply(locale: string, gender: Gender, firstName: string, lastName: string) {
  if (locale === 'de') {
    const salutation =
      gender === 'f' ? `Sehr geehrte Frau ${lastName}` : `Sehr geehrter Herr ${lastName}`;
    return {
      subject: 'Danke für Ihr Interesse an einer Mitgliedschaft — HNK Kroatien Schwyz',
      text: `${salutation},

herzlichen Dank für Ihr Interesse an einer Mitgliedschaft beim HNK Kroatien Schwyz! Wir haben Ihre Anmeldung erhalten und senden Ihnen in Kürze per Post einen Einzahlungsschein für den Mitgliederbeitrag an die von Ihnen angegebene Adresse.

Bei Fragen erreichen Sie uns jederzeit unter info@kroatien-schwyz.ch oder ${CLUB_PHONE}.

Wir freuen uns, Sie bald in unserer Klubfamilie begrüssen zu dürfen!

Freundliche Grüsse
HNK Kroatien Schwyz`,
    };
  }
  const salutation = gender === 'f' ? `Poštovana ${firstName} ${lastName}` : `Poštovani ${firstName} ${lastName}`;
  return {
    subject: 'Zahvaljujemo na interesu za članstvo — HNK Kroatien Schwyz',
    text: `${salutation},

Hvala vam na interesu za članstvo u HNK Kroatien Schwyz! Vaš zahtjev smo zaprimili i uskoro ćemo vam poštom poslati uplatnicu za članarinu na adresu koju ste naveli.

Ukoliko imate pitanja u međuvremenu, slobodno nas kontaktirajte na info@kroatien-schwyz.ch ili ${CLUB_PHONE}.

Radujemo se što ćete postati dio naše klupske obitelji!

Srdačan pozdrav,
HNK Kroatien Schwyz`,
  };
}

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

  // Honeypot — silently accept so bots think they succeeded.
  if (body?.company) return NextResponse.json({ ok: true });

  const gender: Gender | null = body?.gender === 'm' ? 'm' : body?.gender === 'f' ? 'f' : null;
  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const street = clean(body?.street);
  const plz = String(body?.plz ?? '').trim();
  const city = clean(body?.city);
  const phone = clean(body?.phone);
  const email = String(body?.email ?? '').trim();
  const locale = body?.locale === 'de' ? 'de' : 'hr';

  if (
    !gender || !firstName || !lastName || !street || !city ||
    !plzRe.test(plz) || !emailRe.test(email)
  ) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[postani-clan] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const genderLabel = gender === 'f' ? 'Žensko' : 'Muško';
  const rows: [string, string][] = [
    ['Spol', genderLabel],
    ['Ime', firstName],
    ['Prezime', lastName],
    ['Ulica i broj', street],
    ['Poštanski broj', plz],
    ['Mjesto', city],
    ['Telefon', phone || '—'],
    ['E-mail', email],
  ];

  // 1) Notification to the club — this one must succeed.
  let clubId: string | undefined;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: email,
      subject: `Zahtjev za članstvo · ${firstName} ${lastName}`,
      text:
        `Novi zahtjev za članstvo putem web forme:\n\n` +
        rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html:
        `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">` +
        `<p style="margin:0 0 14px"><strong>Novi zahtjev za članstvo putem web forme</strong></p>` +
        `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">` +
        rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:5px 18px 5px 0;color:#666;white-space:nowrap">${esc(k)}</td>` +
              `<td style="padding:5px 0"><strong>${esc(v)}</strong></td></tr>`,
          )
          .join('') +
        `</table></div>`,
    });
    if (error) {
      console.error('[postani-clan] resend club error:', error);
      return NextResponse.json({ error: 'send_failed', detail: error.message }, { status: 502 });
    }
    clubId = data?.id;
  } catch (e) {
    console.error('[postani-clan] exception (club):', e);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  // 2) Auto-reply to the applicant. The club already has the request, so a
  //    failure here is logged but doesn't fail the submission (avoids
  //    duplicate club notifications from retries).
  let replyId: string | undefined;
  try {
    const reply = autoReply(locale, gender, firstName, lastName);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CONTACT_TO,
      subject: reply.subject,
      text: reply.text,
      html: textToHtml(reply.text),
    });
    if (error) console.error('[postani-clan] resend auto-reply error:', error);
    replyId = data?.id;
  } catch (e) {
    console.error('[postani-clan] exception (auto-reply):', e);
  }

  return NextResponse.json({ ok: true, id: clubId, replyId });
}
