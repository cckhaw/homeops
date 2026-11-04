export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="large-title">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-secondary">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
