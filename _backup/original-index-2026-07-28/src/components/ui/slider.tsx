import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui 스타일 슬라이더 (Radix 기반). 색은 이 프로젝트 토큰으로 바꿨다.
 *
 * Radix 는 role="slider" 를 Root 가 아니라 Thumb 에 붙인다.
 * 그래서 접근성 이름과 읽을 값(예: "2023년")은 Thumb 에 직접 넘겨야 한다.
 * Root 에 달면 스크린리더가 "0, 1, 2" 같은 인덱스만 읽는다.
 */
type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  /** 손잡이의 접근성 이름 */
  thumbLabel?: string;
  /** 손잡이가 읽어줄 값 (예: '2023년') */
  thumbValueText?: string;
};

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabel, thumbValueText, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-slate/60">
      <SliderPrimitive.Range className="absolute h-full bg-lamp/70" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={thumbLabel}
      aria-valuetext={thumbValueText}
      className="block h-5 w-5 rounded-full border-2 border-lamp bg-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50"
    />
    </SliderPrimitive.Root>
  )
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
