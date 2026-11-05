import { NextResponse } from 'next/server';
import { findPassportHome, isPassportUnlocked, loadPassport } from '@/lib/passport';

export const dynamic = 'force-dynamic';

/** Public, read-only JSON for a Home Passport. `id` is the household's unguessable passport token. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = await findPassportHome(id);
  if (!home) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  if (!(await isPassportUnlocked(home))) return NextResponse.json({ error: 'password_required' }, { status: 401 });
  const passport = await loadPassport(id);
  if (!passport) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  return NextResponse.json(passport, { headers: { 'Cache-Control': home.passportPasswordHash ? 'private, no-store' : 'public, s-maxage=60, stale-while-revalidate=300' } });
}
