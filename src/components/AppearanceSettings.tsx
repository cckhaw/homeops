'use client';

import { useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { ACCENTS, applyAccent, applyMode, readAccent, readMode, type AccentId, type Mode } from '@/lib/theme';
import { cn } from '@/lib/utils';

const modes: { id: Mode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Day', icon: Sun },
  { id: 'dark', label: 'Night', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
];

export default function AppearanceSettings() {
  const [mode, setMode] = useState<Mode>('system');
  const [accent, setAccent] = useState<AccentId>('logo');
  useEffect(() => {
    setMode(readMode());
    setAccent(readAccent());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="field-label">Mode</p>
        <div role="radiogroup" aria-label="Appearance mode" className="grid grid-cols-3 gap-1 rounded-xl bg-label/5 p-1">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="radio"
              aria-checked={mode === id}
              onClick={() => { setMode(id); applyMode(id); }}
              className={cn('flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition', mode === id ? 'bg-surface shadow-sm' : 'text-secondary')}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-[13px] text-secondary">Auto follows your device&apos;s day/night setting.</p>
      </div>
      <div>
        <p className="field-label">Accent colour</p>
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={accent === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => { setAccent(a.id); applyAccent(a.id); }}
              className={cn('grid h-11 w-11 place-items-center rounded-full ring-offset-2 ring-offset-[rgb(var(--surface))] transition active:scale-90', accent === a.id && 'ring-2 ring-label')}
              style={{ background: a.swatch }}
            >
              {accent === a.id && <Check className="h-5 w-5 text-white drop-shadow" strokeWidth={3} aria-hidden />}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[13px] text-secondary">Saved on this device.</p>
    </div>
  );
}
