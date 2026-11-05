import { Compass } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AppleButton from '@/components/AppleButton';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <AuthCard title="Page not found" subtitle="That page doesn't exist, or it has moved.">
      <div className="space-y-3 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-tint/10 text-tint"><Compass className="h-7 w-7" aria-hidden /></span>
        <AppleButton href="/dashboard" full>Go to my dashboard</AppleButton>
        <AppleButton href="/" variant="plain" full>Back to the home page</AppleButton>
      </div>
    </AuthCard>
  );
}
