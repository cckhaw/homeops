import { and, eq, gt, isNull, count } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts, errorLog } from '@/db/schema';
import AccentScope from '@/components/AccentScope';
import AdminNav from '@/components/AdminNav';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

/** Admin guard: unauthenticated users go to /login, signed-in non-admins go back to /dashboard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [[errors], [scheduled]] = await Promise.all([
    db.select({ n: count() }).from(errorLog).where(isNull(errorLog.resolvedAt)).catch(() => [{ n: 0 }]),
    db.select({ n: count() }).from(blogPosts).where(and(eq(blogPosts.status, 'published'), gt(blogPosts.publishAt, new Date()))).catch(() => [{ n: 0 }]),
  ]);
  return (
    <div className="min-h-dvh">
      <AccentScope />
      <AdminNav badges={{ errors: Number(errors?.n ?? 0), scheduled: Number(scheduled?.n ?? 0) }} />
      <main className="px-4 pb-16 pt-[76px] sm:px-6 md:pl-[17rem] md:pr-8 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
