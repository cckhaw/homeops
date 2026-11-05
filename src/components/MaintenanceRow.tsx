'use client';

import { useState, useTransition } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Sheet } from './misc';
import { TaskEditForm } from './forms';
import { usePrefs } from './PrefsProvider';
import { deleteTask, toggleTask } from '@/app/actions';
import { cn, daysUntil, FREQUENCY_LABEL, formatDate, relativeDue } from '@/lib/utils';

type Props = {
  id: string;
  title: string;
  dueDate: string;
  frequency: string;
  completed: boolean;
  completedAt?: string | null;
  assetName?: string | null;
  assetId?: string | null;
  /** When provided (and the task is pending) an edit button is shown. */
  assets?: { id: string; name: string }[];
  canDelete?: boolean;
};

export default function MaintenanceRow({ id, title, dueDate, frequency, completed, completedAt, assetName, assetId = null, assets, canDelete = true }: Props) {
  const { locale } = usePrefs();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const days = daysUntil(dueDate) ?? 0;
  const overdue = !completed && days < 0;
  const soon = !completed && days >= 0 && days <= 7;

  return (
    <li className={cn('flex items-center gap-3 py-1 transition-opacity', pending && 'opacity-50')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={completed ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
        onClick={() => start(() => toggleTask(id))}
        className="-m-1 grid h-11 w-11 shrink-0 place-items-center active:scale-90"
      >
        <span
          className={cn(
            'grid h-[26px] w-[26px] place-items-center rounded-full border-2 transition',
            completed ? 'border-ok bg-ok text-white' : overdue ? 'border-bad' : 'border-secondary/50',
          )}
        >
          {completed && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-2">
        <p className={cn('truncate text-[17px]', completed && 'text-secondary line-through')}>{title}</p>
        <p className={cn('truncate text-[13px]', overdue ? 'font-medium text-bad' : soon ? 'font-medium text-warn' : 'text-secondary')}>
          {completed ? `Done ${formatDate(completedAt ?? null, undefined, locale)}` : relativeDue(dueDate, locale)}
          {' · '}
          {FREQUENCY_LABEL[frequency] ?? frequency}
          {assetName ? ` · ${assetName}` : ''}
        </p>
      </div>
      {assets && !completed && (
        <>
          <button type="button" aria-label={`Edit "${title}"`} onClick={() => setEditing(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-secondary transition hover:text-tint active:scale-90">
            <Pencil className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <Sheet title="Edit task" open={editing} onClose={() => setEditing(false)}>
            <TaskEditForm task={{ id, title, dueDate, frequency, assetId }} assets={assets} onDone={() => setEditing(false)} />
          </Sheet>
        </>
      )}
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete "${title}"`}
          onClick={() => start(() => deleteTask(id))}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-secondary transition hover:text-bad active:scale-90"
        >
          <Trash2 className="h-[18px] w-[18px]" aria-hidden />
        </button>
      )}
    </li>
  );
}
