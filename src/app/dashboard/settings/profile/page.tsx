import { requireHousehold } from '@/lib/auth';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { ProfileForm } from '@/components/forms';
import { SubmitButton } from '@/components/AppleButton';
import { replayWelcome } from '@/app/security-actions';
import SignOutButton from '../SignOutButton';

export const metadata = { title: 'Profile · Settings' };

export default async function ProfileSettings() {
  const { user } = await requireHousehold();
  return (
    <>
      <PageHeader title="Profile" subtitle="Your name and sign-in e-mail." />
      <GlassCard><ProfileForm fullName={user.fullName} email={user.email} /></GlassCard>
      <GlassCard className="space-y-3">
        <p className="text-[14px] text-secondary">New here again? Take the quick tour of everything Wodejia can do.</p>
        <form action={replayWelcome}><SubmitButton variant="secondary" full>Replay the welcome tour</SubmitButton></form>
      </GlassCard>
      <SignOutButton />
    </>
  );
}
