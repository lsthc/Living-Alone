import { Children, useEffect, useRef, type ReactNode } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn } from '@/lib/utils';

/**
 * 지표 전환 — 버튼으로도 되고, 폰에서는 옆으로 밀어도 된다.
 *
 * 이 앱에는 "같은 자리에 다른 표를 갈아 끼우는" 자리가 여럿 있다.
 * (Ch1 독거노인 수 ↔ 인구 10만 명당 고독사, Ch2 지도에 칠할 네 지표)
 * 폰에서는 작은 알약 버튼을 정확히 누르는 것보다 화면을 미는 편이 훨씬 빠르다.
 *
 * 동작 방식
 *   폰   — 표를 전부 가로로 늘어놓고 scroll-snap 으로 한 장씩 걸리게 한다.
 *          손으로 밀면 걸린 장의 번호가 곧 선택된 지표다. 버튼을 누르면 그 장으로 미끄러진다.
 *   데스크톱 — 고른 장 하나만 그린다. 발표자는 버튼을 누르지 밀지 않는다.
 *
 * scroll-snap 에 맡기는 이유는 기기의 관성·되튐 감각을 그대로 쓰기 위해서다.
 * 제스처를 직접 계산하면 어떤 기기에서는 뻑뻑하고 어떤 기기에서는 미끄럽다.
 */
export function SwipeTabs({
  labels,
  index,
  onIndexChange,
  /** dark = 심야 남색 챕터(Ch0~3) · light = 종이색 챕터(Ch4~) */
  tone = 'dark',
  ariaLabel,
  children,
  className,
}: {
  /** 각 장의 이름. children 과 개수가 같아야 한다. */
  labels: string[];
  index: number;
  onIndexChange: (i: number) => void;
  tone?: 'dark' | 'light';
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const mobile = useIsMobile();
  const railRef = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const dark = tone === 'dark';

  // 밖에서 index 가 바뀌면(버튼 클릭) 그 장으로 미끄러진다.
  // 이미 그 장에 걸려 있으면 아무것도 하지 않는다 — 손으로 미는 중에 되돌리면 안 된다.
  useEffect(() => {
    const rail = railRef.current;
    if (!mobile || !rail || rail.clientWidth === 0) return;
    if (Math.round(rail.scrollLeft / rail.clientWidth) === index) return;
    rail.scrollTo({ left: index * rail.clientWidth, behavior: 'smooth' });
  }, [index, mobile]);

  const onScroll = () => {
    const rail = railRef.current;
    if (!rail || rail.clientWidth === 0) return;
    const i = Math.min(slides.length - 1, Math.max(0, Math.round(rail.scrollLeft / rail.clientWidth)));
    if (i !== index) onIndexChange(i);
  };

  const tabs = (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {labels.map((l, i) => (
        <button
          key={l}
          role="tab"
          aria-selected={i === index}
          onClick={() => onIndexChange(i)}
          className={cn(
            'rounded-full border transition-colors',
            // 폰에서는 손가락이 닿는 높이를 지킨다
            mobile ? 'min-h-[40px] px-3.5 text-sm' : 'px-4 py-2 text-sm',
            i === index
              ? dark
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-weak-fg/50 bg-weak-bg text-weak-fg'
              : dark
                ? 'border-border text-muted hover:border-muted hover:text-body'
                : 'border-border text-muted hover:border-muted hover:text-body'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );

  if (!mobile) {
    return (
      <div className={cn('flex flex-col gap-8', className)}>
        {tabs}
        {slides[index]}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between gap-3">
        {tabs}
        <span className={cn('num shrink-0 text-xs', dark ? 'text-muted' : 'text-muted')}>
          {index + 1} / {slides.length}
        </span>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="deck-rail flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slides.map((child, i) => (
          <div key={i} className="w-full shrink-0 snap-center" aria-hidden={i !== index}>
            {child}
          </div>
        ))}
      </div>

      <p className={cn('text-center text-xs', dark ? 'text-muted' : 'text-muted')}>
        옆으로 밀면 다음 표로 넘어갑니다 · 챕터는 아래 화살표로 넘깁니다
      </p>
    </div>
  );
}
