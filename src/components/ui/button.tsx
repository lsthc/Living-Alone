// Lux(apps/web/src/components/ui/button.tsx)에서 가져온 Toss TDS 버튼.
// variant(fill/weak) x color(primary/danger/light/dark) x size(small~xlarge).
// loading/disabled/pressed/focus 상태 구현. loading 중 너비 유지.
//
// 이 앱은 발표 화면이라 xlarge(56px)를 주 동선에 쓴다 — welcome.html 의 버튼과 같은 규격이라
// QR 로 들어온 학부모가 두 페이지를 오가도 같은 손맛이 난다.
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { vibrateTick } from '@/lib/haptics';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-1.5 font-semibold select-none transition-colors ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
    'disabled:opacity-40 disabled:pointer-events-none active:opacity-80 whitespace-nowrap',
  {
    variants: {
      variant: {
        fill: '',
        weak: '',
      },
      color: {
        primary: '',
        danger: '',
        light: '',
        dark: '',
      },
      size: {
        small: 'h-8 rounded-btn px-3 text-[13px]',
        medium: 'h-[38px] rounded-btn px-4 text-[15px]',
        large: 'h-12 rounded-btn-lg px-5 text-[16px]',
        xlarge: 'h-14 rounded-btn-xl px-6 text-[17px]',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    compoundVariants: [
      // fill
      { variant: 'fill', color: 'primary', class: 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-hover' },
      { variant: 'fill', color: 'danger', class: 'bg-danger text-white hover:brightness-95 active:brightness-90' },
      { variant: 'fill', color: 'light', class: 'bg-elevated text-foreground hover:brightness-110 active:brightness-95' },
      { variant: 'fill', color: 'dark', class: 'bg-foreground text-bg hover:brightness-95 active:brightness-90' },
      // weak
      { variant: 'weak', color: 'primary', class: 'bg-weak-bg text-weak-fg hover:brightness-110 active:brightness-95' },
      { variant: 'weak', color: 'danger', class: 'bg-danger/12 text-danger hover:bg-danger/20' },
      // text-body 는 tailwind config 에서 fontSize 키이기도 해서(16px) 버튼 사이즈를 덮어쓴다.
      // 색상만 지정하도록 arbitrary color 로 명시한다.
      { variant: 'weak', color: 'light', class: 'bg-surface text-[color:var(--body)] hover:bg-elevated' },
      { variant: 'weak', color: 'dark', class: 'bg-elevated text-[color:var(--body)] hover:brightness-110' },
    ],
    defaultVariants: {
      variant: 'fill',
      color: 'primary',
      size: 'medium',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, color, size, fullWidth, loading, asChild, disabled, children, onClick, ...props }, ref) => {
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      vibrateTick();
      onClick?.(e as React.MouseEvent<HTMLButtonElement>);
    };

    // 링크를 버튼처럼 보이게 할 때 실제 <button> 을 중첩하지 않는다.
    // Slot 이 <a> 자체에 스타일/이벤트를 합쳐 유효한 단일 인터랙티브 요소를 만든다.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, color, size, fullWidth }), className)}
          aria-disabled={isDisabled || undefined}
          aria-busy={loading}
          onClick={(e) => {
            if (isDisabled) {
              e.preventDefault();
              return;
            }
            handleClick(e);
          }}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(buttonVariants({ variant, color, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-busy={loading}
        onClick={handleClick}
        {...props}
      >
        {/* loading 중에도 자식으로 너비 유지 (숨김) */}
        <span className={cn('inline-flex items-center gap-1.5', loading && 'invisible')}>{children}</span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-[1.15em] w-[1.15em]" />
          </span>
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
