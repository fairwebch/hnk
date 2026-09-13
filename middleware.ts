import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Stari WordPress (kroatien-schwyz.ch) je koristio datumski-prefiksirane
 * permalinke za članke: /%year%/%monthnum%/%day%/%postname%/. Datum varira
 * po članku pa se ne može statično nabrojati u next.config.mjs redirects()
 * (vidi scripts/migration/redirect-map.json za pun inventar) — ovdje samo
 * izvlačimo postname segment i preslikavamo na /hr/novosti/{slug}.
 *
 * Slugovi su 1:1 očuvani u migraciji OSIM jednog: stari post je imao
 * URL-encoded emoji (⚽) na kraju slug-a koji novi sadržaj nema — ta iznimka
 * mora doći prije generičkog passthrough-a.
 */
const WP_DATED_POST = /^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\/?$/;

const WP_POST_SLUG_OVERRIDES: Record<string, string> = {
  'malonogometni-turnir-23-11-2024-⚽': 'malonogometni-turnir-23-11-2024',
};

function wpDatedPostRedirect(request: NextRequest): NextResponse | null {
  const match = WP_DATED_POST.exec(request.nextUrl.pathname);
  if (!match) return null;

  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // Malformed percent-encoding — fall through with the raw segment.
  }
  slug = WP_POST_SLUG_OVERRIDES[slug] ?? slug;

  const url = request.nextUrl.clone();
  url.pathname = `/hr/novosti/${slug}`;
  url.search = '';
  return NextResponse.redirect(url, 308);
}

export default function middleware(request: NextRequest) {
  return wpDatedPostRedirect(request) ?? intlMiddleware(request);
}

export const config = {
  // Skip Next internals, API routes and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
