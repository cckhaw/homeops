import { redirect } from 'next/navigation';

/** Settings is split into one page per topic; the first is Profile. */
export default function SettingsIndex() {
  redirect('/dashboard/settings/profile');
}
