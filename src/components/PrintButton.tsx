'use client';

import { Printer } from 'lucide-react';
import AppleButton from './AppleButton';

export default function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <AppleButton type="button" onClick={() => window.print()}>
      <Printer className="h-5 w-5" aria-hidden /> {label}
    </AppleButton>
  );
}
