import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, the Sanity Studio, the check-in tool, API routes and
  // files with an extension.
  matcher: ['/((?!api|studio|checkin|_next|_vercel|.*\\..*).*)'],
};
