import type { HTMLAttributes } from 'react';
import { cn } from '../utils.js';

type Tone = 'gray' | 'green' | 'red' | 'yellow' | 'blue';

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function Badge({
  tone = 'gray',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  );
}
