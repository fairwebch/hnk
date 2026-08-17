import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Confirmation links land back on the site in the visitor's language.
// Only localhost is honored from the Origin header (local testing);
// everything else pins to production so the redirect can't be forged.
const PROD_ORIGIN = 'https://kroatien-schwyz.vercel.app';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Honeypot — silently accept.
  if (body?.company) return NextResponse.json({ ok: true });

  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: 'validation' }, { status: 422 });
  }
  const locale = body?.locale === 'de' ? 'de' : 'hr';

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID ?? '3');
  const templateId = Number(process.env.BREVO_DOI_TEMPLATE_ID ?? '0');
  if (!apiKey || !templateId) {
    console.error('[newsletter] BREVO_API_KEY or BREVO_DOI_TEMPLATE_ID missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const reqOrigin = req.headers.get('origin') ?? '';
  const origin = reqOrigin.startsWith('http://localhost') ? reqOrigin : PROD_ORIGIN;

  try {
    // Double opt-in: Brevo emails a confirmation link (DOI template); the
    // contact only joins the list after clicking it.
    const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        includeListIds: [listId],
        templateId,
        redirectionUrl: `${origin}/${locale}/newsletter-potvrda`,
      }),
    });

    // 201 = DOI process started, 204 = contact already exists (Brevo still
    // sends the confirmation email when not yet subscribed).
    if (res.status === 201 || res.status === 204) {
      return NextResponse.json({ ok: true });
    }
    const data = await res.json().catch(() => ({}));
    console.error('[newsletter] brevo error:', res.status, data);
    return NextResponse.json({ error: 'send_failed', detail: data?.message }, { status: 502 });
  } catch (e) {
    console.error('[newsletter] exception:', e);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }
}
