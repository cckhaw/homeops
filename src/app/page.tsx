import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight, BadgeCheck, BarChart3, BellRing, Building2, CalendarSync, Check, ClipboardCheck, Download, FileArchive, FileSpreadsheet, FolderLock, Globe, HardHat, KeyRound,
  Lock, MessageCircle, Moon, Package, Palette, QrCode, ReceiptText, ScanLine, Share2, ShieldCheck, Smartphone, Trash2, UserCheck, Users, type LucideIcon,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import AppleButton from '@/components/AppleButton';
import { donationsEnabled } from '@/lib/donate';
import Logo from '@/components/Logo';
import AppPreview from '@/components/landing/AppPreview';

export const dynamic = 'force-dynamic';

type Feature = { icon: LucideIcon; title: string; body: string; isNew?: boolean };
type Group = { id: string; icon: LucideIcon; title: string; lede: string; items: Feature[] };

const GROUPS: Group[] = [
  {
    id: 'know',
    icon: Package,
    title: 'Know what you own',
    lede: 'Every appliance, system and piece of paperwork, documented once and easy to find.',
    items: [
      { icon: Package, title: 'Asset passport', body: 'Make, model, serial number, install date, warranty and a photo — with logos from over 150 brands.' },
      { icon: ScanLine, title: 'Receipt scanning', body: 'Photograph a receipt and HomeOps reads the model, serial and dates for you.' },
      { icon: FolderLock, title: 'Document vault', body: 'Insurance, mortgage, deeds and inspection reports, kept private with optional expiry dates.', isNew: true },
      { icon: QrCode, title: 'QR labels', body: 'Print a sticker for each appliance. Scan it to open its page — warranty, manual and history.', isNew: true },
    ],
  },
  {
    id: 'never-miss',
    icon: BellRing,
    title: 'Never miss a thing',
    lede: 'Small jobs stay small when something reminds you at the right moment.',
    items: [
      { icon: ClipboardCheck, title: 'Seasonal maintenance', body: 'Climate-aware checklists — tropical or temperate — that reschedule themselves when you tick them off.' },
      { icon: BellRing, title: 'Warranty and expiry alerts', body: 'A heads-up before a warranty or an insurance policy runs out, then once more in the last week.' },
      { icon: MessageCircle, title: 'Reminders where you are', body: 'Get your digest by e-mail or as a push notification on your phone or computer — each one optional. WhatsApp is coming soon.', isNew: true },
      { icon: CalendarSync, title: 'Your own calendar feed', body: 'Subscribe in Apple, Google or Outlook Calendar and see due dates beside everything else.' },
    ],
  },
  {
    id: 'together',
    icon: Users,
    title: 'Run it together',
    lede: 'Homes are shared by nature. HomeOps is built for the whole household.',
    items: [
      { icon: Building2, title: 'Many homes, one login', body: 'Give each home its own icon and switch in a tap or a search — family house, rental, holiday flat.' },
      { icon: UserCheck, title: 'Assign the work', body: 'Invite family or co-owners with a private link and give each task to the right person.' },
      { icon: HardHat, title: 'Contractors book', body: 'Your plumber and electrician one tap away — call or WhatsApp — and one contractor can serve several homes.', isNew: true },
      { icon: BarChart3, title: 'Bills and spending', body: 'Track utility bills with spike warnings, and see a yearly spending report you can download.', isNew: true },
    ],
  },
  {
    id: 'share',
    icon: Share2,
    title: 'Share and move on',
    lede: 'Selling, renting out or handing over? Show a well-kept home in one link.',
    items: [
      { icon: BadgeCheck, title: 'Home Service Passport', body: 'A read-only page buyers and tenants can trust — off by default, optionally password-protected.' },
      { icon: FileArchive, title: 'Move-out pack', body: 'One zip with a printable summary, spreadsheets and every receipt, manual and photo.', isNew: true },
      { icon: Download, title: 'Your data, your call', body: 'Download everything any time, or delete your account and data in a few taps.' },
      { icon: FileSpreadsheet, title: 'Spreadsheet export', body: 'Assets, service history and yearly spending as CSV, whenever you want a copy.' },
    ],
  },
];

const EVERYWHERE = [
  { icon: Smartphone, title: 'Phone, tablet, desktop', body: 'Designed for each screen, and installable like an app.' },
  { icon: Moon, title: 'Light and dark', body: 'Follows your device, with seven accent colours to make it yours.' },
  { icon: Globe, title: 'Local by default', body: '18 currencies and regional date formats, including MYR, SGD and more.' },
  { icon: ReceiptText, title: 'Free to start', body: 'Everything you need for one home, with no ads and no tracking.' },
];

const PRIVACY = [
  { icon: Lock, title: 'Files stay private', body: 'Receipts, manuals and documents are stored privately and only ever shown to members of your home.' },
  { icon: KeyRound, title: 'Strong sign-in', body: 'Passwords of 12+ characters, two-factor codes, lockouts and rate limits against guessing.' },
  { icon: ShieldCheck, title: 'No ads, no trackers', body: 'We don’t sell or share your data, and there are no advertising or tracking cookies.' },
  { icon: Trash2, title: 'Delete whenever you like', body: 'Export a full copy of your data or erase your account — your records are yours.' },
];

const STEPS = [
  { n: '1', title: 'Add what you own', body: 'Snap a receipt or type in an appliance. HomeOps fills in the rest and sets up its upkeep.' },
  { n: '2', title: 'Let it remind you', body: 'Seasonal jobs, warranties and policy renewals reach you by e-mail or push notification.' },
  { n: '3', title: 'Share when it matters', body: 'Hand a buyer, agent or tenant a passport link or a complete move-out pack.' },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-tint">{children}</p>;
}

export default async function Landing({ searchParams: sp }: { searchParams: Promise<{ deleted?: string }> }) {
  const searchParams = await sp;
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5">
          <Link href="/" aria-label="HomeOps"><Logo size={36} /></Link>
          <nav aria-label="Sections" className="hidden items-center gap-7 text-[15px] font-medium text-secondary md:flex">
            <a href="#features" className="transition hover:text-label">Features</a>
            <a href="#how" className="transition hover:text-label">How it works</a>
            <a href="#private" className="transition hover:text-label">Privacy</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <AppleButton href="/login" variant="plain">Sign in</AppleButton>
            <AppleButton href="/register" className="hidden sm:inline-flex">Get started</AppleButton>
          </div>
        </div>
      </header>

      {searchParams.deleted && (
        <p role="status" className="bg-ok/10 px-5 py-3 text-center text-[15px] font-medium text-ok">Your account and personal data have been permanently deleted.</p>
      )}

      <main>
        {/* ---------------------------------------------------------------- hero */}
        <section className="relative bg-[radial-gradient(70rem_34rem_at_50%_-8rem,rgb(var(--brand)/0.16),transparent)] pb-20 pt-14 text-center sm:pb-32 sm:pt-20">
          <div className="mx-auto max-w-4xl px-5">
            <a href="#features" className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border bg-surface/70 py-1 pl-1 pr-3.5 text-[13px] font-medium shadow-sm backdrop-blur hairline">
              <span className="rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ontint">New</span>
              <span className="truncate text-secondary">Reports, vault &amp; push reminders</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-tint" aria-hidden />
            </a>
            <h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[60px] lg:text-[68px]">
              Everything about your home,{' '}<span className="whitespace-nowrap text-tint">in one place.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-[18px] leading-snug text-secondary sm:text-[21px]">
              HomeOps keeps your appliances, warranties, paperwork, repairs and running costs organised — and reminds you before anything slips.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AppleButton href="/register" className="min-w-[230px]">Get started — it&apos;s free</AppleButton>
              <AppleButton href="#features" variant="secondary" className="min-w-[200px]">Explore features</AppleButton>
            </div>
            <ul className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-secondary">
              {['No ads or tracking', 'Works on every device', 'Your data stays yours'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-ok" strokeWidth={3} aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <AppPreview />
        </section>

        {/* ---------------------------------------------------------------- features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-8 pt-20 sm:pt-28">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Eyebrow>What&apos;s inside</Eyebrow>
            <h2 className="text-[32px] font-bold leading-tight tracking-tight sm:text-[44px]">One app for everything your home needs.</h2>
            <p className="mt-3 text-[18px] text-secondary">Sixteen tools, working together, organised the way you actually think about your home.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {GROUPS.map((g) => (
              <article key={g.id} className="glass rounded-[28px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8" aria-labelledby={`g-${g.id}`}>
                <header className="mb-6 flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint text-ontint shadow-sm"><g.icon className="h-6 w-6" aria-hidden /></span>
                  <div>
                    <h3 id={`g-${g.id}`} className="text-[24px] font-bold leading-tight tracking-tight">{g.title}</h3>
                    <p className="mt-1 text-[15px] leading-snug text-secondary">{g.lede}</p>
                  </div>
                </header>
                <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {g.items.map(({ icon: Icon, title, body, isNew }) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                      <div className="min-w-0">
                        <h4 className="text-[16px] font-semibold leading-tight">
                          {title}
                          {isNew && <span className="ml-2 inline-block rounded-full bg-tint/10 px-2 py-0.5 align-[1px] text-[10.5px] font-bold uppercase tracking-wide text-tint">New</span>}
                        </h4>
                        <p className="mt-1 text-[14px] leading-snug text-secondary">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- everywhere */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-label="Made for every screen">
          <div className="grid gap-px overflow-hidden rounded-[28px] border bg-[var(--hairline)] hairline sm:grid-cols-2 lg:grid-cols-4">
            {EVERYWHERE.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-surface p-6 sm:p-7">
                <Icon className="mb-4 h-7 w-7 text-tint" aria-hidden />
                <h3 className="text-[17px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-snug text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- how it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-[32px] font-bold leading-tight tracking-tight sm:text-[44px]">Set it up in minutes. Then forget it.</h2>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="glass relative rounded-[24px] p-7">
                <span className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-tint text-[19px] font-bold text-ontint" aria-hidden>{s.n}</span>
                <h3 className="text-[21px] font-bold leading-tight">{s.title}</h3>
                <p className="mt-2 text-[15.5px] leading-snug text-secondary">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- privacy */}
        <section id="private" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-8 pt-20 sm:pt-28">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Eyebrow>Private by design</Eyebrow>
              <h2 className="text-[32px] font-bold leading-tight tracking-tight sm:text-[42px]">Your home is personal. We treat it that way.</h2>
              <p className="mt-4 max-w-md text-[17px] leading-snug text-secondary">
                Receipts, policies and deeds are sensitive. HomeOps keeps them private, secured, and entirely under your control.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-semibold text-tint">
                <Link href="/privacy" className="inline-flex items-center gap-1.5">Privacy Policy <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                <Link href="/terms" className="inline-flex items-center gap-1.5">Terms <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PRIVACY.map(({ icon: Icon, title, body }) => (
                <li key={title} className="glass rounded-[22px] p-5">
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-tint/10 text-tint"><Icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="text-[16.5px] font-semibold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-snug text-secondary">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------------- final call */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="relative overflow-hidden rounded-[32px] bg-tint px-6 py-14 text-center text-ontint sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_-20%,rgba(255,255,255,0.28),transparent)]" aria-hidden />
            <div className="relative mx-auto max-w-2xl">
              <Palette className="mx-auto mb-4 h-8 w-8 opacity-90" aria-hidden />
              <h2 className="text-[32px] font-bold leading-tight tracking-tight sm:text-[46px]">Give your home the care it deserves.</h2>
              <p className="mx-auto mt-4 max-w-xl text-[17px] leading-snug opacity-90">Create your free account and have your first appliance, reminder and passport set up in minutes.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex min-h-[50px] min-w-[230px] items-center justify-center rounded-xl bg-white px-6 text-[17px] font-semibold text-black shadow-lg transition active:scale-[0.97]">Get started — it&apos;s free</Link>
                <Link href="/login" className="inline-flex min-h-[50px] items-center justify-center rounded-xl px-6 text-[17px] font-semibold text-ontint/95 underline-offset-4 hover:underline">I already have an account</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-10 hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <Link href="/" aria-label="HomeOps"><Logo size={28} /></Link>
          <p className="text-[13px] text-secondary">
            © {new Date().getFullYear()} HomeOps
            {' · '}
            <Link href="/privacy" className="font-semibold text-tint">Privacy</Link>
            {' · '}
            <Link href="/terms" className="font-semibold text-tint">Terms</Link>
            {donationsEnabled() && (
              <>
                {' · '}
                <Link href="/support" className="font-semibold text-tint">☕ Buy me a coffee</Link>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
