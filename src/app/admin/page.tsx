import { count, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, households, maintenanceTasks, profiles } from '@/db/schema';
import { getLimits } from '@/lib/settings';
import { toggleUnlimitedTier } from '@/app/actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';

export default async function AdminHome() {
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const [[u], [h], [a], [t], signups, limits] = await Promise.all([
    db.select({ n: count() }).from(profiles),
    db.select({ n: count() }).from(households),
    db.select({ n: count() }).from(assets),
    db.select({ n: count() }).from(maintenanceTasks).where(sql`${maintenanceTasks.status} = 'completed'`),
    db
      .select({ day: sql<string>`to_char(${profiles.createdAt}, 'YYYY-MM-DD')`, n: count() })
      .from(profiles)
      .where(gte(profiles.createdAt, since))
      .groupBy(sql`to_char(${profiles.createdAt}, 'YYYY-MM-DD')`),
    getLimits(),
  ]);

  const perDay = new Map(signups.map((s) => [s.day, s.n]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, n: perDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const last30 = days.reduce((s, d) => s + d.n, 0);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Live from Neon" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Users" value={u.n} />
        <Stat label="Households" value={h.n} />
        <Stat label="Active assets" value={a.n} />
        <Stat label="Tasks completed" value={t.n} />
      </div>

      <GlassCard className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold">New users — last 30 days</h2>
          <span className="text-[15px] text-secondary">{last30} total</span>
        </div>
        <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={`Daily signups over the last 30 days: ${last30} total`}>
          {days.map((d) => (
            <div key={d.key} title={`${d.key}: ${d.n}`} className="flex-1 rounded-t bg-tint/80" style={{ height: `${Math.max(d.n ? 6 : 2, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[19px] font-bold">Unlimited free tier</h2>
          <p className="text-[14px] text-secondary">Currently <strong>{limits.unlimited ? 'ON' : 'OFF'}</strong>{limits.unlimited ? ' — no limits for free households.' : ` — ${limits.assets} assets / ${limits.members} members per home.`}</p>
        </div>
        <form action={toggleUnlimitedTier.bind(null, !limits.unlimited)}>
          <AppleButton type="submit" variant={limits.unlimited ? 'destructive' : 'primary'}>{limits.unlimited ? 'Turn off' : 'Turn on'}</AppleButton>
        </form>
      </GlassCard>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[30px] font-bold leading-none">{value.toLocaleString()}</p>
      <p className="mt-1 text-[13px] text-secondary">{label}</p>
    </GlassCard>
  );
}
