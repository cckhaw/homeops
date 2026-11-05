'use client';

import { useState } from 'react';
import HomeIcon from './HomeIcon';
import { HOME_ICONS, DEFAULT_HOME_ICON } from '@/lib/home-icons';
import { cn } from '@/lib/utils';

/** Pick one of the 12 home icons. Submits the choice as the `icon` form field. */
export default function IconPicker({ value, name = 'icon', onChange }: { value?: string; name?: string; onChange?: (id: string) => void }) {
  const [chosen, setChosen] = useState(value ?? DEFAULT_HOME_ICON);
  const pick = (id: string) => {
    setChosen(id);
    onChange?.(id);
  };
  return (
    <div>
      <input type="hidden" name={name} value={chosen} />
      <div role="radiogroup" aria-label="Home icon" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {HOME_ICONS.map((i) => {
          const on = chosen === i.id;
          return (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={i.label}
              title={i.label}
              onClick={() => pick(i.id)}
              className={cn(
                'grid min-h-[56px] place-items-center rounded-2xl border transition active:scale-95',
                on ? 'border-tint bg-tint/10 text-tint ring-2 ring-tint/30' : 'hairline text-secondary hover:bg-label/5',
              )}
            >
              <HomeIcon id={i.id} className="h-6 w-6" />
              <span className="mt-0.5 text-[10px] font-medium leading-none">{i.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
