import { Heart } from 'lucide-react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import AppleButton from '@/components/AppleButton';
import Logo from '@/components/Logo';

export const metadata = { title: 'Thank you!', robots: { index: false } };

export default function Thanks() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <GlassCard className="w-full max-w-sm space-y-4 p-7 text-center">
        <Link href="/" aria-label="Wodejia" className="inline-block"><Logo size={36} /></Link>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ok/10 text-ok"><Heart className="h-7 w-7" aria-hidden /></span>
        <h1 className="text-[26px] font-bold">Thank you! ☕</h1>
        <p className="text-secondary">Your support means a lot and helps keep Wodejia free for everyone. A receipt is on its way from Stripe.</p>
        <AppleButton href="/dashboard" full>Back to Wodejia</AppleButton>
      </GlassCard>
    </main>
  );
}
