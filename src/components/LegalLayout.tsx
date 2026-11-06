import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import { ThemeToggle } from './misc';
import GlassCard from './GlassCard';

export const SUPPORT_EMAIL = 'me@khaw.cc';
export const LAST_UPDATED = 'November 2026';

export type LegalSection = { id: string; title: string };

/** Shared chrome for /privacy and /terms: sticky header, table of contents, glass article card, footer. */
export default function LegalLayout({
  title, intro, sections, backHref, other, children,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  backHref: string;
  other: { href: string; label: string };
  children: React.ReactNode;
}) {
  const toc = (
    <ol className="space-y-0.5 text-[15px]">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-secondary transition hover:bg-label/5 hover:text-label">
            <span className="w-5 shrink-0 text-right tabular-nums text-secondary/70">{i + 1}.</span>
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="min-h-dvh pb-16">
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-1.5">
          <Link href={backHref} className="flex min-h-[44px] items-center gap-1 rounded-xl pr-3 text-[17px] text-tint" aria-label="Back to Wodejia">
            <ArrowLeft className="h-5 w-5" aria-hidden /> Back
          </Link>
          <Link href="/" aria-label="Wodejia"><Logo size={30} /></Link>
          <span className="flex w-[72px] justify-end"><ThemeToggle /></span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <h1 className="large-title sm:text-[44px]">{title}</h1>
        <p className="mt-3 max-w-2xl text-[19px] leading-snug text-secondary">{intro}</p>
        <p className="mt-2 text-[14px] text-secondary">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[250px_1fr]">
          {/* Mobile: collapsible contents. Desktop: sticky sidebar. */}
          <nav aria-label="Table of contents" className="lg:sticky lg:top-20">
            <details className="glass rounded-apple p-2 lg:hidden">
              <summary className="min-h-[44px] cursor-pointer px-2 py-2.5 text-[17px] font-semibold">Contents</summary>
              <div className="pb-2">{toc}</div>
            </details>
            <div className="hidden lg:block">
              <p className="mb-2 px-2 text-[13px] font-semibold uppercase tracking-wide text-secondary">Contents</p>
              {toc}
            </div>
          </nav>

          <GlassCard className="space-y-10 p-6 shadow-sm sm:p-9">
            {children}
          </GlassCard>
        </div>

        <footer className="mt-10 space-y-2 text-center text-[14px] text-secondary">
          <p>Last updated: {LAST_UPDATED}</p>
          <p>
            Questions? <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-tint">{SUPPORT_EMAIL}</a>
          </p>
          <p>
            <Link href={other.href} className="font-semibold text-tint">{other.label}</Link>
            {' · '}
            <Link href="/" className="font-semibold text-tint">Home</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 text-[17px] leading-relaxed [&_a]:font-semibold [&_a]:text-tint [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
      <h2 className="text-[24px] font-bold leading-tight tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-tint/10 px-4 py-3 text-[16px] font-medium">{children}</p>;
}
