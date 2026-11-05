import { asc, eq, sql } from 'drizzle-orm';
import { Mail, MessageCircle, Phone, Trash2, Wrench } from 'lucide-react';
import { db } from '@/db';
import { contractors, serviceRecords } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { getPrefs } from '@/lib/prefs';
import { toInternational, whatsappLink } from '@/lib/phone';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteContractor } from '@/app/records-actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import { ContractorForm } from '@/components/records-forms';
import { ConfirmButton } from '@/components/misc';

export const metadata = { title: 'Contractors' };
export const dynamic = 'force-dynamic';

export default async function ContractorsPage() {
  const { household } = await requireHousehold();
  const { locale, currency } = await getPrefs();
  const [list, stats] = await Promise.all([
    db.select().from(contractors).where(eq(contractors.householdId, household.id)).orderBy(asc(contractors.trade), asc(contractors.name)),
    db
      .select({ id: serviceRecords.contractorId, jobs: sql<number>`count(*)::int`, spent: sql<number>`coalesce(sum(${serviceRecords.costCents}),0)::int`, last: sql<string>`max(${serviceRecords.serviceDate})` })
      .from(serviceRecords)
      .where(eq(serviceRecords.householdId, household.id))
      .groupBy(serviceRecords.contractorId),
  ]);
  const byId = new Map(stats.map((s) => [s.id, s]));
  const trades = [...new Set(list.map((c) => c.trade))];

  return (
    <>
      <PageHeader title="Contractors" subtitle="The people you call when something breaks" />
      <GlassCard className="mb-6"><h2 className="mb-3 text-[17px] font-semibold">Add a contractor</h2><ContractorForm /></GlassCard>

      {list.length === 0 ? (
        <GlassCard className="p-6 text-center text-[15px] text-secondary">No contractors yet. Add your plumber or electrician, then pick them when you log a repair.</GlassCard>
      ) : (
        trades.map((trade) => (
          <section key={trade} className="mb-6">
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-secondary">{trade}</h2>
            <div className="space-y-3">
              {list.filter((c) => c.trade === trade).map((c) => {
                const intl = toInternational(c.phone, currency);
                const s = byId.get(c.id);
                const act = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-tint/10 px-4 text-[15px] font-semibold text-tint';
                return (
                  <GlassCard key={c.id} className="space-y-3" data-testid="contractor">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-semibold">{c.name}</p>
                        <p className="text-[13px] text-secondary">
                          {s ? <><Wrench className="mr-1 inline h-3.5 w-3.5" aria-hidden />{s.jobs} job{s.jobs === 1 ? '' : 's'} · {formatCurrency(s.spent, currency, locale)} · last {formatDate(s.last, undefined, locale)}</> : 'No jobs logged yet'}
                        </p>
                        {c.notes && <p className="mt-1 text-[14px] text-secondary">{c.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className={act}><Phone className="h-4 w-4" aria-hidden /> Call</a>}
                      {intl && <a href={whatsappLink(intl)} target="_blank" rel="noopener noreferrer" className={act}><MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp</a>}
                      {c.email && <a href={`mailto:${c.email}`} className={act}><Mail className="h-4 w-4" aria-hidden /> E-mail</a>}
                    </div>
                    <details className="border-t pt-1 hairline">
                      <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-semibold text-tint">Edit</summary>
                      <div className="space-y-3 pb-2">
                        <ContractorForm id={c.id} initial={c} />
                        <form action={deleteContractor.bind(null, c.id)}>
                          <ConfirmButton message={`Remove ${c.name}? Past service records keep the name.`} label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete</ConfirmButton>
                        </form>
                      </div>
                    </details>
                  </GlassCard>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
