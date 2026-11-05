'use client';

import { useState, useTransition } from 'react';
import AppleButton from './AppleButton';
import HomeIcon from './HomeIcon';
import IconPicker from './IconPicker';
import { Sheet } from './misc';
import { setHomeIcon } from '@/app/actions';

/** Tile showing a home's icon; owners/admins can tap it to choose another. */
export default function HomeIconButton({ id, name, icon, editable }: { id: string; name: string; icon: string; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(icon);
  const [pending, start] = useTransition();
  const tile = (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tint/10 text-tint">
      <HomeIcon id={icon} className="h-5 w-5" />
    </span>
  );
  if (!editable) return tile;
  return (
    <>
      <button type="button" onClick={() => { setChosen(icon); setOpen(true); }} aria-label={`Change icon for ${name}`} title="Change icon" className="rounded-xl transition active:scale-95">
        {tile}
      </button>
      <Sheet title={`Icon for ${name}`} open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <IconPicker value={chosen} onChange={setChosen} />
          <AppleButton type="button" full disabled={pending} onClick={() => start(async () => { await setHomeIcon(id, chosen); setOpen(false); })}>
            Save icon
          </AppleButton>
        </div>
      </Sheet>
    </>
  );
}
