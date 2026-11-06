import { Bell, FolderDown, Home, Palette, ShieldCheck, UserRound } from 'lucide-react';

/** The Settings pages, in order. Used by the sidebar (collapsible Settings entry) and the phone tab row. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', href: '/dashboard/settings/profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', href: '/dashboard/settings/appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', href: '/dashboard/settings/notifications', label: 'Notifications', icon: Bell },
  { id: 'security', href: '/dashboard/settings/security', label: 'Security', icon: ShieldCheck },
  { id: 'home', href: '/dashboard/settings/home', label: 'Home', icon: Home },
  { id: 'privacy', href: '/dashboard/settings/privacy', label: 'Privacy & data', icon: FolderDown },
] as const;
