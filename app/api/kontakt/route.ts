import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Destination inbox. Defaults to the club address; can be overridden with the
// CONTACT_TO env var while the Resend domain is still being verified
// (Resend only delivers to the account owner until then).
const CONTACT_TO = process.env.CONTACT_TO || 'info@kroatien-schwyz.ch';
// Sender: Resend test domain for now; switch to info@kroatien-schwyz.ch once
// the domain is verified in Resend.
const FROM = 'HNK Kroatien Schwyz <onboarding@resend.dev>';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const message = String(body?.message ?? '').trim();

  if (!name || !email || !message || !emailRe.test(email) || message.length < 3) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }

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
      subject: `Kontakt · ${name}`,
      text: `Ime: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
        <p><strong>Ime:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}</p>
        <p style="white-space:pre-wrap">${esc(message)}</p>
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
