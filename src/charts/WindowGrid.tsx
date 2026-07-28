import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * 산복도로의 창문 — 이 앱의 유일한 시각 모티프.
 *
 * 사각형 하나 = 독거노인 가구 `unit` 가구.
 * Chapter 0 에서 하나씩 켜지고, 이후 챕터에서 선·지도·막대로 변형된다.
 */
export interface WindowGridProps {
  /** 켤 사각형 개수 */
  count: number;
  /** 한 줄에 몇 칸 */
  columns?: number;
  /** 사각형 한 변(px) */
  size?: number;
  /** 칸 사이 간격(px) */
  gap?: number;
  /** 전체가 다 켜지기까지 걸리는 시간(ms) */
  duration?: number;
  className?: string;
  /** 스크린리더용 설명 */
  label: string;
  /** 사각형 색. 종이색 배경(Chapter 4 이후)에서는 앰버가 보이지 않아 바꿔 쓴다. */
  fill?: string;
  /** 딱 한 칸만 다른 색으로 켠다. Chapter 4 에서 '당신의 창문'을 가리키는 데 쓴다. */
  highlight?: { index: number; fill: string } | null;
}

export function WindowGrid({
  count,
  columns = 24,
  size = 14,
  gap = 6,
  duration = 4200,
  className,
  label,
  fill = 'var(--lamp)',
  highlight = null,
}: WindowGridProps) {
  const reduced = useReducedMotion();

  // 켜지는 순서를 무작위로 섞는다. 왼쪽부터 차례로 켜지면 기계처럼 보인다.
  // count 가 같으면 순서도 같도록 고정 시드를 쓴다 (렌더마다 흔들리지 않게).
  const order = useMemo(() => {
    const idx = Array.from({ length: count }, (_, i) => i);
    let seed = 20240101;
    for (let i = idx.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const j = seed % (i + 1);
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    // idx[k] = k번째로 켜질 사각형 → 사각형별 지연시간으로 뒤집는다
    const delay = new Array<number>(count);
    idx.forEach((square, k) => {
      delay[square] = (k / Math.max(count, 1)) * (duration / 1000);
    });
    return delay;
  }, [count, duration]);

  const rows = Math.ceil(count / columns);

  return (
    <div
      className={cn('inline-block', className)}
      role="img"
      aria-label={label}
      // 고유 크기를 상한으로만 두고 좁은 화면에서는 줄어들게 한다.
      // width 로 못박으면 인라인 스타일이 w-full 을 이겨 375px 화면에서 가로 스크롤이 생긴다.
      style={{ maxWidth: columns * size + (columns - 1) * gap, width: '100%' }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${columns * size + (columns - 1) * gap} ${rows * size + (rows - 1) * gap}`}
        aria-hidden
      >
        {Array.from({ length: count }, (_, i) => {
          const col = i % columns;
          const row = Math.floor(i / columns);
          const isMine = highlight?.index === i;
          return (
            <motion.rect
              key={i}
              x={col * (size + gap)}
              y={row * (size + gap)}
              width={size}
              height={size}
              fill={isMine ? highlight.fill : fill}
              initial={{ opacity: reduced ? (isMine ? 1 : 0.85) : 0 }}
              animate={{ opacity: isMine ? 1 : 0.85 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : // 지목된 칸은 나머지가 다 켜진 뒤 마지막에 켠다
                    { duration: 0.7, delay: isMine ? duration / 1000 + 0.3 : order[i], ease: 'easeOut' }
              }
            />
          );
        })}
      </svg>
    </div>
  );
}
