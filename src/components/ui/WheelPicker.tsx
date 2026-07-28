import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** 한 칸 높이(px). 손가락으로 굴렸을 때 한 칸이 또렷하게 걸리는 최소 크기다. */
const ITEM = 48;
/** 보이는 칸 수 (홀수여야 가운데가 생긴다) */
const VISIBLE = 5;

export interface WheelOption {
  value: string;
  label: string;
}

/**
 * 세로로 굴려서 고르는 선택기 (iOS·Toss 의 그것).
 *
 * 손으로 위아래로 밀면 가운데 칸에 걸리고, 시트 아래의 확인 버튼을 눌러야 확정된다.
 * 굴리는 동안 값이 바로 확정되면, 지나가는 값마다 화면이 다시 계산돼 손가락이 무거워진다.
 *
 * 걸림은 CSS scroll-snap 이 맡는다. 직접 관성을 계산하지 않는 편이
 * 기기마다의 스크롤 감각을 그대로 살린다.
 */
export function WheelPicker({
  options,
  value,
  onChange,
  tone = 'light',
  ariaLabel,
}: {
  options: WheelOption[];
  /** 지금 가운데 걸려 있는 값 */
  value: string;
  onChange: (value: string) => void;
  tone?: 'dark' | 'light';
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const dark = tone === 'dark';
  const pad = ((VISIBLE - 1) / 2) * ITEM;

  // 처음 열릴 때 지금 값이 가운데 오도록 맞춘다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    el.scrollTop = i * ITEM;
    setCenter(i);
    // 열릴 때 한 번만. 굴리는 중에 스크롤 위치를 되돌리면 안 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
    if (i !== center) {
      setCenter(i);
      onChange(options[i].value);
    }
  };

  return (
    <div className="relative" style={{ height: VISIBLE * ITEM }}>
      {/* 가운데 걸림 칸 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg border',
          dark ? 'border-lamp/45 bg-lamp/10' : 'border-weakfg/40 bg-weakbg/70'
        )}
        style={{ height: ITEM }}
        aria-hidden
      />
      {/* 위아래로 흐려지는 띠 — 가운데에 눈이 가게 한다 */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: dark
            ? 'linear-gradient(180deg, #191f28 0%, rgba(25,31,40,0) 34%, rgba(25,31,40,0) 66%, #191f28 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 66%, #ffffff 100%)',
        }}
        aria-hidden
      />

      <div
        ref={ref}
        onScroll={onScroll}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(e) => {
          const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
          if (!delta) return;
          // 여기서 막지 않으면 챕터 덱이 화살표를 가져간다
          e.preventDefault();
          e.stopPropagation();
          const i = Math.min(options.length - 1, Math.max(0, center + delta));
          ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' });
        }}
        className="wheel-scroll h-full snap-y snap-mandatory overflow-y-auto overscroll-contain focus-visible:ring-0"
      >
        <div style={{ height: pad }} aria-hidden />
        {options.map((o, i) => (
          <div
            key={o.value}
            role="option"
            aria-selected={i === center}
            className={cn(
              'flex snap-center items-center justify-center text-center transition-colors',
              i === center
                ? dark
                  ? 'text-lg text-paper'
                  : 'text-lg text-ink'
                : dark
                  ? 'text-base text-paper/35'
                  : 'text-base text-ink/35'
            )}
            style={{ height: ITEM }}
          >
            {o.label}
          </div>
        ))}
        <div style={{ height: pad }} aria-hidden />
      </div>
    </div>
  );
}
