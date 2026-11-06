'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { HouseholdForm } from './forms';
import { Sheet } from './misc';

/** Pencil button on a home in "My homes": opens that home's details (name, icon, address, currency, climate) in a sheet. */
export default function EditHomeButton({ home, current }: { home: { id: string; name: string; address: string | null; currency: string; climate: string; icon: string }; current: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${home.name}`}
        title="Edit home"
        data-testid="edit-home"
        data-current={current ? 'true' : 'false'}
        className="grid h-11 w-11 place-items-center rounded-xl text-secondary transition hover:bg-label/5 hover:text-tint active:scale-90"
      >
        <Pencil className="h-[18px] w-[18px]" aria-hidden />
      </button>
      <Sheet title={`Edit ${home.name}`} open={open} onClose={() => setOpen(false)}>
        <HouseholdForm homeId={home.id} name={home.name} address={home.address} currency={home.currency} climate={home.climate} icon={home.icon} />
      </Sheet>
    </>
  );
}
