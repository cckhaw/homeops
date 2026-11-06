import SettingsTabs from '@/components/SettingsTabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsTabs />
      <div className="max-w-3xl space-y-4">{children}</div>
    </>
  );
}
