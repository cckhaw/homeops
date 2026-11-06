import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMarkdown, type Block, type Inline } from '@/lib/markdown-core';

/** Renders the safe Markdown AST (lib/markdown-core.ts). Nothing here ever uses dangerouslySetInnerHTML. */
function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text': return <span key={i}>{n.v}</span>;
          case 'strong': return <strong key={i} className="font-semibold text-label"><Inlines nodes={n.c} /></strong>;
          case 'em': return <em key={i}><Inlines nodes={n.c} /></em>;
          case 'code': return <code key={i} className="rounded-md bg-label/[0.07] px-1.5 py-0.5 text-[0.9em]">{n.v}</code>;
          case 'link': {
            const external = /^(https?:|mailto:)/i.test(n.href);
            const cls = 'font-medium text-tint underline decoration-tint/30 underline-offset-[3px] transition hover:decoration-tint';
            return external ? (
              <a key={i} href={n.href} className={cls} target={n.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer"><Inlines nodes={n.c} /></a>
            ) : (
              <Link key={i} href={n.href} className={cls}><Inlines nodes={n.c} /></Link>
            );
          }
        }
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'heading': {
            const cls = { 2: 'mb-3 mt-12 scroll-mt-24 text-[28px] font-bold leading-tight tracking-tight', 3: 'mb-2 mt-8 scroll-mt-24 text-[21px] font-semibold leading-snug', 4: 'mb-2 mt-6 scroll-mt-24 text-[17px] font-semibold' }[b.level];
            const Tag = `h${b.level}` as 'h2' | 'h3' | 'h4';
            return <Tag key={i} id={b.id} className={cls}><Inlines nodes={b.c} /></Tag>;
          }
          case 'p': return <p key={i} className="my-4"><Inlines nodes={b.c} /></p>;
          case 'hr': return <hr key={i} className="my-10 border-t hairline" />;
          case 'code': return <pre key={i} className="my-5 overflow-x-auto rounded-2xl bg-label/[0.06] p-4 text-[14px] leading-relaxed"><code>{b.v}</code></pre>;
          case 'quote': return <blockquote key={i} className="my-6 rounded-r-2xl border-l-4 border-tint bg-tint/[0.06] px-5 py-1 text-[17px]"><Blocks blocks={b.c} /></blockquote>;
          case 'list': {
            const check = b.items.some((x) => x.checked !== null);
            const List = b.ordered ? 'ol' : 'ul';
            return (
              <List key={i} className={cn('my-5 space-y-2.5', !check && (b.ordered ? 'list-decimal pl-6 marker:font-semibold marker:text-tint' : 'list-disc pl-6 marker:text-tint'), check && 'list-none pl-0')}>
                {b.items.map((it, j) => (
                  <li key={j} className={cn(check && 'flex gap-3')}>
                    {check && (
                      <span className={cn('mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border-2', it.checked ? 'border-tint bg-tint text-ontint' : 'border-secondary/50')} role="img" aria-label={it.checked ? 'Done' : 'To do'}>
                        {it.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                      </span>
                    )}
                    <span className="min-w-0"><Inlines nodes={it.c} /></span>
                  </li>
                ))}
              </List>
            );
          }
          case 'table':
            return (
              <div key={i} className="my-7 overflow-x-auto rounded-2xl border hairline">
                <table className="w-full min-w-[34rem] border-collapse text-left text-[15px]">
                  <thead className="bg-label/[0.05]">
                    <tr>{b.head.map((h, j) => <th key={j} scope="col" className="px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-secondary"><Inlines nodes={h} /></th>)}</tr>
                  </thead>
                  <tbody className="divide-y hairline [&>tr]:border-inherit">
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k} className={cn('px-4 py-3 align-top', k === 0 && 'font-medium text-label')}><Inlines nodes={c} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

export default function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('text-[18px] leading-[1.75] text-label/90', className)}>
      <Blocks blocks={parseMarkdown(source)} />
    </div>
  );
}
