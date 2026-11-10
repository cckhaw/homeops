import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { canonicalRedirect } from '@/lib/domain-redirect';

// Signed-in areas need a session (/admin is additionally role-checked in its layout).
const requireSession = withAuth({});

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  // The retired domain forwards to the main one (permanent, keeps path and query).
  const to = canonicalRedirect(req.nextUrl, req.headers.get('host') ?? '', process.env.NEXTAUTH_URL);
  if (to) return NextResponse.redirect(to, 308);
  if (/^\/(dashboard|admin)(\/|$)/.test(req.nextUrl.pathname)) return (requireSession as unknown as (r: NextRequest, e: NextFetchEvent) => Response | Promise<Response>)(req, ev);
  return NextResponse.next();
}

// Normal visitors only pass through here on the signed-in areas; the old hostname is matched everywhere so every old URL is forwarded.
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', { source: '/:path*', has: [{ type: 'host', value: 'homeops.khaw.cc' }] }],
};
