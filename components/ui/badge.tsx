import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#1E3A8A] text-white hover:bg-blue-900',
        secondary:
          'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200',
        brand:
          'border-transparent bg-[#1E3A8A] text-white',
        success:
          'border-transparent bg-emerald-50 text-emerald-700',
        warning:
          'border-transparent bg-amber-50 text-amber-700',
        destructive:
          'border-transparent bg-red-50 text-red-700',
        outline: 'text-slate-800 border-slate-200',
        blue: 'border-transparent bg-blue-50 text-[#1E3A8A]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  className?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

