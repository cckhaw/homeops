'use client';

import { signOut } from 'next-auth/react';
import AppleButton from '@/components/AppleButton';

export default function SignOutButton() {
  return (
    <AppleButton variant="destructive" full onClick={() => signOut({ callbackUrl: '/' })}>
      Sign out
    </AppleButton>
  );
}
