import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { openBlob } from '@/lib/blob';
import { isMember } from '@/lib/household';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Streams a vault document to a signed-in member of the home that owns it. There is no public link. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc?.fileUrl || !(await isMember(user.id, doc.householdId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const file = await openBlob(doc.fileUrl).catch(() => null);
  if (!file) return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  return new Response(file.stream, {
    headers: {
      'Content-Type': file.blob.contentType || 'application/octet-stream',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
