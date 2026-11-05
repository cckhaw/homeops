import { NextResponse } from 'next/server';
import { findPassportHome, isPassportUnlocked, loadPassport } from '@/lib/passport';

export const dynamic = 'force-dynamic';

/** Public, read-only JSON for a Home Passport. `id` is the household's unguessable passport token. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const home = await findPassportHome(params.id);
  if (!home) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  if (!isPassportUnlocked(home)) return NextResponse.json({ error: 'password_required' }, { status: 401 });
  const passport = await loadPassport(params.id);
  if (!passport) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  return NextResponse.json(passport, { headers: { 'Cache-Control': home.passportPasswordHash ? 'private, no-store' : 'public, s-maxage=60, stale-while-revalidate=300' } });
}
