import Link from 'next/link';
import { Sparkles } from 'lucide-react';

/** Shown to demo visitors at the top of every signed-in page. */
export default function DemoBanner() {
  return (
    <div role="note" data-testid="demo-banner" className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-tint px-4 py-3 text-[14px] text-ontint print:hidden">
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1"><b>You are exploring the Wodejia demo.</b> Everything here is sample data. Change anything you like: it is deleted automatically. Some features (uploads, scanning, notifications) are switched off.</p>
      <Link href="/register" className="inline-flex min-h-[40px] items-center rounded-xl bg-white px-4 font-semibold text-black">Create your free account</Link>
    </div>
  );
}
