import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#1E3A8A] text-white shadow hover:bg-blue-900',
        secondary:
          'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200',
        brand:
          'border-transparent bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
        warning:
          'border-orange-200 bg-orange-50 text-orange-700 font-bold',
        destructive:
          'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'text-slate-900 border-slate-200',
        blue: 'border-blue-200 bg-blue-50 text-[#1E3A8A] font-bold',
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

