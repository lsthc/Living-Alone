import { Children, useRef, useState, type ReactNode } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn } from '@/lib/utils';

/**
 * 한 챕터에 표가 여러 개일 때, 폰에서는 옆으로 밀어 다음 표로 넘어가게 한다.
 *
 * 폰에서 표 두 개를 위아래로 쌓으면 두 번째 표는 사실상 아무도 못 본다.
 * 스크롤을 한참 내려야 나오는데, 그 전에 이미 챕터를 넘겨 버리기 때문이다.
 * 옆으로 미는 방식이면 표가 몇 개인지 점으로 보이고, 한 번에 하나씩 온전히 읽힌다.
 *
 * 넓은 화면(md 이상)에서는 원래대로 전부 세로로 쌓아 보여준다 — 프로젝터에서는
 * 두 표를 동시에 놓고 비교하는 편이 낫고, 발표자가 손으로 밀 일도 없다.
 *
 * 걸림은 CSS scroll-snap 이 맡는다. 터치 제스처를 직접 계산하지 않으므로
 * 관성·되튐이 기기 기본 동작 그대로다.
 */
export function SwipeDeck({
  /** 각 슬라이드의 짧은 이름. children 과 개수가 같아야 한다. */
  labels,
  /** dark = 심야 남색 챕터(Ch0~3) · light = 종이색 챕터(Ch4~) */
  tone = 'dark',
  /** 넓은 화면에서 표들을 어떻게 배치할지. 기본은 세로로 쌓기. */
  desktopClassName = 'flex flex-col gap-14',
  children,
  className,
}: {
  labels: string[];
  tone?: 'dark' | 'light';
  desktopClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  const dark = tone === 'dark';
  const mobile = useIsMobile();
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const slides = Children.toArray(children);

  if (!mobile) {
    return <div className={cn(desktopClassName, className)}>{slides}</div>;
  }

  const goTo = (i: number) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({ left: i * rail.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const rail = railRef.current;
    if (!rail || rail.clientWidth === 0) return;
    const i = Math.round(rail.scrollLeft / rail.clientWidth);
    if (i !== active) setActive(Math.min(slides.length - 1, Math.max(0, i)));
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* 지금 몇 번째 표인지 + 눌러서 바로 가기 */}
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="표 선택" className="flex flex-wrap gap-1.5">
          {labels.map((l, i) => (
            <button
              key={l}
              role="tab"
              aria-selected={i === active}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                i === active
                  ? dark
                    ? 'border-lamp/60 bg-lamp/15 text-lamp'
                    : 'border-weakfg/50 bg-weakbg text-weakfg'
                  : dark
                    ? 'border-slate/50 text-paper/50'
                    : 'border-ink/20 text-ink/55'
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <span className={cn('num shrink-0 text-xs', dark ? 'text-paper/45' : 'text-ink/45')}>
          {active + 1} / {slides.length}
        </span>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="deck-rail flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {slides.map((child, i) => (
          <div key={i} className="w-full shrink-0 snap-center pr-0" aria-hidden={i !== active}>
            {child}
          </div>
        ))}
      </div>

      <p className={cn('text-center text-xs', dark ? 'text-paper/40' : 'text-ink/45')}>
        옆으로 밀면 다음 표로 넘어갑니다 · 챕터는 아래 화살표로 넘깁니다
      </p>
    </div>
  );
}
