import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        info: 'border-transparent bg-blue-100 text-blue-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type Tone = 'gray' | 'green' | 'red' | 'yellow' | 'blue';
const toneToVariant: Record<Tone, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  gray: 'secondary',
  green: 'success',
  red: 'destructive',
  yellow: 'warning',
  blue: 'info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** 兼容旧 API：tone="gray|green|red|yellow|blue" */
  tone?: Tone;
}

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  const finalVariant = variant ?? (tone ? toneToVariant[tone] : 'default');
  return <span className={cn(badgeVariants({ variant: finalVariant }), className)} {...props} />;
}

export { badgeVariants };
