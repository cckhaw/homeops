'use client';

import { useState, useTransition } from 'react';
import { BadgeCheck, BellRing, ChevronLeft, ChevronRight, FolderLock, HardHat, Package, Smartphone, Users } from 'lucide-react';
import AppleButton from './AppleButton';
import { Sheet } from './misc';
import { markWelcomeSeen } from '@/app/security-actions';
import { cn } from '@/lib/utils';

const SLIDES = [
  { icon: Package, title: 'Your home, documented', body: 'Add appliances and equipment with brand, model, warranty and photos. Snap a receipt, or the model sticker, and Wodejia reads the details for you. Print QR labels to stick on each item and scan them to jump straight to its record.' },
  { icon: BellRing, title: 'Never miss maintenance', body: 'Seasonal checklists for your climate repeat on their own when you tick them off. Get one daily digest by e-mail or push notification for tasks, warranties and documents about to expire — switch them on in Settings.' },
  { icon: FolderLock, title: 'Records, bills and spending', body: 'Keep insurance, title deeds and other papers in a private document vault with expiry dates. Track utility bills (with spike warnings) and download a yearly report of what the home really costs you.' },
  { icon: HardHat, title: 'Trusted contractors', body: 'Save your plumber, electrician and aircon technician once, tap to call or message, and mark which of your homes each one covers.' },
  { icon: Users, title: 'Share with your household', body: 'Invite family or co-owners with a private link, assign tasks, manage several homes from one account, and add the schedule to your phone’s calendar.' },
  { icon: BadgeCheck, title: 'A passport you can share', body: 'Selling or renting? Share a read-only Home Service Passport showing how well the home has been looked after — password-protect it if you like. Moving out? Download a complete move-out pack with every record and file.' },
  { icon: Smartphone, title: 'Make it yours', body: 'Add Wodejia to your Home Screen to use it like an app, switch between light and dark, and pick an accent colour in Settings. You can replay this tour from Settings any time.' },
];

/** First-run welcome: a few short slides. Closing it (Done, Skip or tapping outside) marks it as seen. */
export default function WelcomeTour({ initiallyOpen }: { initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [step, setStep] = useState(0);
  const [, start] = useTransition();
  const close = () => {
    setOpen(false);
    start(() => markWelcomeSeen());
  };
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <Sheet title="Welcome to Wodejia" open={open} onClose={close}>
      <div className="space-y-6 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-tint/10 text-tint"><Icon className="h-10 w-10" aria-hidden /></span>
        <div aria-live="polite">
          <h3 className="text-[24px] font-bold">{slide.title}</h3>
          <p className="mt-2 text-[17px] leading-snug text-secondary">{slide.body}</p>
        </div>
        <div className="flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, i) => <span key={i} className={cn('h-2 rounded-full transition-all', i === step ? 'w-6 bg-tint' : 'w-2 bg-label/20')} />)}
        </div>
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <AppleButton type="button" variant="plain" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" aria-hidden /> Back</AppleButton>
          ) : (
            <AppleButton type="button" variant="plain" onClick={close}>Skip</AppleButton>
          )}
          {last ? (
            <AppleButton type="button" onClick={close}>Get started</AppleButton>
          ) : (
            <AppleButton type="button" onClick={() => setStep(step + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden /></AppleButton>
          )}
        </div>
      </div>
    </Sheet>
  );
}
