import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Destination inbox. Defaults to the club address; can be overridden with the
// CONTACT_TO env var while the Resend domain is still being verified
// (Resend only delivers to the account owner until then).
const CONTACT_TO = process.env.CONTACT_TO || 'info@kroatien-schwyz.ch';
// Sender: verified kroatien-schwyz.ch domain in Resend.
const FROM = 'HNK Kroatien Schwyz <info@kroatien-schwyz.ch>';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Allowed topics (dropdown values) → labels for the club inbox.
const TOPIC_LABELS: Record<string, string> = {
  clanstvo: 'Članstvo',
  momcadi: 'Treninzi i momčadi',
  dogadjaji: 'Događaji i prijave',
  sponzorstvo: 'Sponzorstvo i donacije',
  ostalo: 'Ostalo',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Honeypot — silently accept so bots think they succeeded.
  if (body?.company) return NextResponse.json({ ok: true });

  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const phone = String(body?.phone ?? '').trim().slice(0, 60); // optional
  const topic = String(body?.topic ?? '');
  const message = String(body?.message ?? '').trim();
  const consent = body?.consent === true;

  if (
    !name || !email || !message || !emailRe.test(email) || message.length < 3 ||
    !TOPIC_LABELS[topic] || !consent
  ) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }
  const topicLabel = TOPIC_LABELS[topic];

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[kontakt] RESEND_API_KEY missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: email,
      subject: `Kontakt · ${topicLabel} · ${name}`,
      text:
        `Ime: ${name}\nEmail: ${email}\n` +
        (phone ? `Telefon: ${phone}\n` : '') +
        `Tema: ${topicLabel}\n` +
        `Privola za obradu podataka: da (${new Date().toISOString()})\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
        <p><strong>Ime:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}${
          phone ? `<br><strong>Telefon:</strong> ${esc(phone)}` : ''
        }<br><strong>Tema:</strong> ${esc(topicLabel)}</p>
        <p style="white-space:pre-wrap">${esc(message)}</p>
        <p style="font-size:12px;color:#777">Privola za obradu podataka: da (${new Date().toISOString()})</p>
      </div>`,
    });
    if (error) {
      console.error('[kontakt] resend error:', error);
      return NextResponse.json({ error: 'send_failed', detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[kontakt] exception:', e);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }
}
