import { desc, eq } from 'drizzle-orm';
import { ExternalLink, FileText, Trash2 } from 'lucide-react';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { requireHousehold } from '@/lib/auth';
import { DOCUMENT_CATEGORIES, expiryState } from '@/lib/documents-core';
import { cn, todayISO } from '@/lib/utils';
import { deleteDocument } from '@/app/records-actions';
import GlassCard from '@/components/GlassCard';
import PageHeader from '@/components/PageHeader';
import AppleButton from '@/components/AppleButton';
import { DocumentForm } from '@/components/records-forms';
import { ConfirmButton } from '@/components/misc';

export const metadata = { title: 'Document vault' };
export const dynamic = 'force-dynamic';

const TONE = { none: 'text-secondary', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' } as const;

export default async function DocumentsPage() {
  const { household } = await requireHousehold();
  const list = await db.select().from(documents).where(eq(documents.householdId, household.id)).orderBy(desc(documents.createdAt));
  const today = todayISO();
  const cats = [...DOCUMENT_CATEGORIES].filter((c) => list.some((d) => d.category === c));

  return (
    <>
      <PageHeader title="Document vault" subtitle="Insurance, mortgage, deeds and reports — private to your household" />
      <GlassCard className="mb-6"><h2 className="mb-3 text-[17px] font-semibold">Add a document</h2><DocumentForm /></GlassCard>

      {list.length === 0 ? (
        <GlassCard className="p-6 text-center text-[15px] text-secondary">Nothing here yet. Add your insurance policy and set its expiry date — we&apos;ll remind you before it lapses.</GlassCard>
      ) : (
        cats.map((cat) => (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-secondary">{cat}</h2>
            <div className="space-y-3">
              {list.filter((d) => d.category === cat).map((d) => {
                const ex = expiryState(d.expiresOn, today);
                return (
                  <GlassCard key={d.id} className="space-y-2" data-testid="document">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><FileText className="h-5 w-5" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-semibold">{d.title}</p>
                        <p className={cn('text-[13px] font-medium', TONE[ex.tone])}>{ex.label}</p>
                        {d.notes && <p className="mt-1 text-[14px] text-secondary">{d.notes}</p>}
                      </div>
                      {d.fileUrl && <AppleButton href={`/api/documents/${d.id}`} variant="secondary"><ExternalLink className="h-4 w-4" aria-hidden /> Open</AppleButton>}
                    </div>
                    <details className="border-t pt-1 hairline">
                      <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-semibold text-tint">Edit</summary>
                      <div className="space-y-3 pb-2">
                        <DocumentForm id={d.id} initial={d} />
                        <form action={deleteDocument.bind(null, d.id)}>
                          <ConfirmButton message={`Delete “${d.title}” and its file?`} label={`Delete ${d.title}`}><Trash2 className="h-4 w-4" aria-hidden /> Delete</ConfirmButton>
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
