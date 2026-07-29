// Lux(apps/web/src/components/ui/badge.tsx)에서 가져온 배지.
// 상태/분류 표시용. 클릭 불가(비인터랙티브).
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-semibold leading-[18px]',
  {
    variants: {
      tone: {
        neutral: 'bg-elevated text-body',
        primary: 'bg-weak-bg text-weak-fg',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-danger/15 text-danger',
      },
      size: {
        sm: '',
        md: 'px-2.5 py-1 text-[13px] leading-[20px]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
