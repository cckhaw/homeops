import { BadgeCheck, Home, Newspaper, PiggyBank, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOOK: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  Maintenance: { icon: Wrench, from: '#2b5bb5', to: '#4fa773' },
  Warranties: { icon: BadgeCheck, from: '#1f3a6b', to: '#5b9df0' },
  Money: { icon: PiggyBank, from: '#2f8f5a', to: '#2b5bb5' },
  'Buying & selling': { icon: Home, from: '#d9731a', to: '#e5a528' },
  'Product updates': { icon: Newspaper, from: '#7b3fc4', to: '#3a56d4' },
};

/** A generated cover (no image files to manage): category colour gradient, a soft pattern and an icon. */
export default function BlogCover({ category, className, large }: { category: string; className?: string; large?: boolean }) {
  const look = LOOK[category] ?? LOOK.Maintenance;
  const Icon = look.icon;
  return (
    <div
      aria-hidden="true"
      className={cn('relative grid place-items-center overflow-hidden', className)}
      style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}
    >
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-white/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
      <Icon className={cn('relative text-white/95 drop-shadow-sm', large ? 'h-24 w-24' : 'h-12 w-12')} strokeWidth={1.6} />
    </div>
  );
}
