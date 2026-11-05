import { redirect } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import { Users } from 'lucide-react';
import { db } from '@/db';
import { householdInvites, households } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { acceptInvite } from '@/app/actions';
import GlassCard from '@/components/GlassCard';
import AppleButton, { SubmitButton } from '@/components/AppleButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Join household' };

export default async function JoinPage({ params: p, searchParams: sp }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const [params, searchParams] = await Promise.all([p, sp]);
  const [invite] = await db
    .select({ name: households.name })
    .from(householdInvites)
    .innerJoin(households, eq(households.id, householdInvites.householdId))
    .where(and(eq(householdInvites.token, params.token), gt(householdInvites.expiresAt, new Date())));

  const user = await getCurrentUser();
  if (!invite) {
    return (
      <Shell title="Invite unavailable">
        <p className="text-secondary">This invite link is invalid or has expired. Ask the household owner for a new one.</p>
        <AppleButton href={user ? '/dashboard' : '/'} variant="secondary" full>Go to HomeOps</AppleButton>
      </Shell>
    );
  }
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/join/${params.token}`)}`);

  async function join() {
    'use server';
    const r = await acceptInvite(params.token);
    if (r?.error) redirect(`/join/${params.token}?error=${encodeURIComponent(r.error)}`);
  }

  return (
    <Shell title={`Join ${invite.name}`}>
      <p className="text-secondary">You&apos;ll share this home&apos;s appliances, warranties and maintenance checklist.</p>
      {searchParams.error && <p role="alert" className="text-[15px] text-bad">{searchParams.error}</p>}
      <form action={join}>
        <SubmitButton full>Join household</SubmitButton>
      </form>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <GlassCard className="w-full max-w-sm space-y-4 p-7 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-tint/10 text-tint"><Users className="h-7 w-7" aria-hidden /></span>
        <h1 className="text-[26px] font-bold">{title}</h1>
        {children}
      </GlassCard>
    </main>
  );
}
