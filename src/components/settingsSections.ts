import { Bell, FolderDown, Home, Palette, ShieldCheck, UserRound } from 'lucide-react';

/** The sections of the Settings page, in order. Used by the sidebar (collapsible Settings entry) and the phone jump menu. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'privacy', label: 'Privacy & data', icon: FolderDown },
] as const;
