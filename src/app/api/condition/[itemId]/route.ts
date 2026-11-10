import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { conditionItems, conditionReports } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { openBlob } from '@/lib/blob';
import { isMember } from '@/lib/household';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A condition-report photo, for members of the home that owns the report. Photos have no public link. */
export async function GET(_: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!UUID.test(itemId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [row] = await db.select({ url: conditionItems.photoUrl, home: conditionReports.householdId }).from(conditionItems).innerJoin(conditionReports, eq(conditionReports.id, conditionItems.reportId)).where(eq(conditionItems.id, itemId));
  if (!row?.url || !(await isMember(user.id, row.home))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const file = await openBlob(row.url).catch(() => null);
  if (!file) return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  return new Response(file.stream, { headers: { 'Content-Type': file.blob.contentType || 'application/octet-stream', 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'" } });
}
