import { BadgeCheck, ExternalLink } from 'lucide-react';
import { requireHousehold } from '@/lib/auth';
import { disablePassport, enablePassport, regeneratePassport } from '@/app/actions';
import { loadPassport } from '@/lib/passport';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton, { SubmitButton } from '@/components/AppleButton';
import { CopyButton, ShareButton } from '@/components/misc';
import { PassportPasswordForm } from '@/components/security-forms';

export const metadata = { title: 'Home Passport' };

export default async function PassportPage() {
  const { household, role } = await requireHousehold();
  const canManage = role === 'owner' || role === 'admin';
  const preview = household.passportToken ? await loadPassport(household.passportToken) : null;

  const path = household.passportToken ? `/passport/${household.passportToken}` : null;

  return (
    <>
      <PageHeader title="Home Passport" subtitle="A certified, read-only record of your home's upkeep" />
      <GlassCard className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ok/10 text-ok"><BadgeCheck className="h-7 w-7" aria-hidden /></span>
          <div>
            <p className="text-[17px] font-semibold">{path ? 'Sharing is on' : 'Sharing is off'}</p>
            <p className="text-[13px] text-secondary">{path ? 'Anyone with the link can view — no sign-in, no edits, no e-mails or documents.' : 'Turn on to get a link for buyers, agents or tenants.'}</p>
          </div>
        </div>
        {path ? (
          <>
            <p className="break-all rounded-xl bg-label/5 px-3 py-2.5 font-mono text-[13px]" data-testid="passport-path">{path}</p>
            <div className="flex flex-wrap gap-3">
              <CopyButton path={path} />
              <ShareButton path={path} title={`${household.name} — Home Service Passport`} />
              <AppleButton href={path} variant="plain"><ExternalLink className="h-4 w-4" aria-hidden /> Preview</AppleButton>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-3 border-t pt-4 hairline">
                <form action={regeneratePassport}><SubmitButton variant="secondary">New link</SubmitButton></form>
                <form action={disablePassport}><SubmitButton variant="destructive">Turn off sharing</SubmitButton></form>
              </div>
            )}
          </>
        ) : canManage ? (
          <form action={enablePassport}><SubmitButton>Create share link</SubmitButton></form>
        ) : (
          <p className="text-[15px] text-secondary">Ask a home owner or admin to enable sharing.</p>
        )}
      </GlassCard>

      {path && canManage && (
        <>
          <h2 className="mb-2 px-1 text-[22px] font-bold">Password protection</h2>
          <GlassCard className="mb-6"><PassportPasswordForm hasPassword={!!household.passportPasswordHash} /></GlassCard>
        </>
      )}

      {preview && (
        <GlassCard className="grid grid-cols-3 gap-4 text-center">
          <Metric label="Assets" value={preview.stats.assets} />
          <Metric label="Check-ups done" value={preview.stats.completed} />
          <Metric label="Health" value={preview.stats.overall == null ? '—' : `${preview.stats.overall}`} />
        </GlassCard>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-[28px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[12px] text-secondary">{label}</p>
    </div>
  );
}
