import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { HOME_COOKIE, isMember } from '@/lib/household';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Only app pages may be the destination — never an external address.
const SAFE_NEXT = /^\/dashboard(\/[A-Za-z0-9_-]+)*\/?$/;

/** Makes `home` the active home (if the signed-in user belongs to it) and continues to `next`. Used when a link points into another of their homes. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const home = url.searchParams.get('home') ?? '';
  const next = url.searchParams.get('next') ?? '/dashboard';
  const dest = new URL(SAFE_NEXT.test(next) ? next : '/dashboard', url.origin);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(dest.pathname)}`, url.origin), 303);
  const res = NextResponse.redirect(dest, 303);
  if (UUID.test(home) && (await isMember(user.id, home))) {
    res.cookies.set(HOME_COOKIE, home, { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
