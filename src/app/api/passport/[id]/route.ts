import { NextResponse } from 'next/server';
import { loadPassport } from '@/lib/passport';

export const dynamic = 'force-dynamic';

/** Public, read-only JSON for a Home Passport. `id` is the household's unguessable passport token. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const passport = await loadPassport(params.id);
  if (!passport) return NextResponse.json({ error: 'Passport not found' }, { status: 404 });
  return NextResponse.json(passport, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
