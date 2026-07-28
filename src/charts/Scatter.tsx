import { useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useReveal } from '@/lib/useReveal';
import { linearFit, pearson } from '@/lib/hypothesis';

/**
 * 산점도 — x축 노후주택 비율, y축 독거노인 비율, 점 크기는 인구.
 * 원도심은 앰버, 나머지는 회청. 추세선과 상관계수 r 을 함께 그린다.
 *
 * 상관은 인과가 아니다. 이 문장은 Chapter 6 의 '연구의 한계'에도 다시 나온다.
 */

export interface ScatterPoint {
  key: string;
  label: string;
  x: number;
  y: number;
  size: number | null;
  highlight: boolean;
}

/** 폰에서는 viewBox 를 좁혀 글자가 실제로 읽히는 크기를 지킨다 (IndexTrend 와 같은 원칙) */
const DIMS = {
  desktop: { W: 760, H: 520, M: { top: 28, right: 28, bottom: 58, left: 62 } },
  mobile: { W: 440, H: 440, M: { top: 24, right: 18, bottom: 52, left: 44 } },
} as const;

export function Scatter({
  points,
  xLabel,
  yLabel,
  selected,
  onSelect,
  ariaLabel,
  mobile = false,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
  ariaLabel: string;
  /** 폰 화면이면 좁은 viewBox 로 그리고, 이름표는 원도심·선택된 점에만 붙인다 */
  mobile?: boolean;
}) {
  const { W, H, M } = DIMS[mobile ? 'mobile' : 'desktop'];
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;
  const reduced = useReducedMotion();
  // 지도와 같은 이유로 뷰포트 판정은 SVG 하나에서만 한다
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useReveal(svgRef, 0.15);
  const shown = reduced || inView;

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const pad = (arr: number[]) => {
      const lo = Math.min(...arr);
      const hi = Math.max(...arr);
      const gap = (hi - lo) * 0.12 || 1;
      return { lo: lo - gap, hi: hi + gap };
    };
    const xd = pad(xs);
    const yd = pad(ys);
    const sizes = points.map((p) => p.size ?? 0).filter((s) => s > 0);
    const maxSize = sizes.length ? Math.max(...sizes) : 0;

    return {
      x: (v: number) => M.left + ((v - xd.lo) / (xd.hi - xd.lo)) * PW,
      y: (v: number) => M.top + PH - ((v - yd.lo) / (yd.hi - yd.lo)) * PH,
      xd,
      yd,
      // 넓이가 인구에 비례하도록 반지름은 제곱근으로. 폰에서는 플롯이 좁아 반지름도 줄인다.
      r: (s: number | null) =>
        s && maxSize ? (mobile ? 4 + 12 * Math.sqrt(s / maxSize) : 6 + 18 * Math.sqrt(s / maxSize)) : mobile ? 5 : 7,
      fit: linearFit(xs, ys),
      r2: pearson(xs, ys),
    };
  }, [points, mobile, M, PW, PH]);

  if (!model) return null;

  const ticks = (d: { lo: number; hi: number }) => [d.lo, (d.lo + d.hi) / 2, d.hi];

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      {/* 눈금 */}
      {ticks(model.yd).map((v) => (
        <g key={`y${v}`}>
          <line x1={M.left} x2={M.left + PW} y1={model.y(v)} y2={model.y(v)} stroke="#4e5968" strokeWidth={1} />
          <text x={M.left - 10} y={model.y(v) + 4} textAnchor="end" className="fill-paper/55 font-sans text-[12px]">
            {v.toFixed(0)}
          </text>
        </g>
      ))}
      {ticks(model.xd).map((v) => (
        <text
          key={`x${v}`}
          x={model.x(v)}
          y={M.top + PH + 24}
          textAnchor="middle"
          className="fill-paper/55 font-sans text-[12px]"
        >
          {v.toFixed(0)}
        </text>
      ))}

      <text x={M.left + PW / 2} y={H - 12} textAnchor="middle" className="fill-paper/55 font-sans text-[13px]">
        {xLabel}
      </text>
      <text
        x={-(M.top + PH / 2)}
        y={16}
        transform="rotate(-90)"
        textAnchor="middle"
        className="fill-paper/55 font-sans text-[13px]"
      >
        {yLabel}
      </text>

      {/* 추세선 */}
      {model.fit && (
        <motion.line
          x1={model.x(model.xd.lo)}
          y1={model.y(model.fit.intercept + model.fit.slope * model.xd.lo)}
          x2={model.x(model.xd.hi)}
          y2={model.y(model.fit.intercept + model.fit.slope * model.xd.hi)}
          stroke="#ffffff"
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeDasharray="6 6"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: shown ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut' }}
        />
      )}

      {/* 점 */}
      {points.map((p, i) => {
        const isSel = selected === p.key;
        return (
          // 지도와 같은 이유로 상호작용은 일반 <g>, 애니메이션은 안쪽 motion.g 가 맡는다
          <g
            key={p.key}
            tabIndex={0}
            role="button"
            aria-label={`${p.label}, ${xLabel} ${p.x}, ${yLabel} ${p.y}`}
            className="cursor-pointer outline-none"
            onMouseEnter={() => onSelect?.(p.key)}
            onFocus={() => onSelect?.(p.key)}
            onClick={() => onSelect?.(isSel ? null : p.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.(isSel ? null : p.key);
              }
            }}
          >
          <motion.g
            initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.6 }}
            animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.6 }}
            transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.04, ease: 'easeOut' }}
          >
            <circle
              cx={model.x(p.x)}
              cy={model.y(p.y)}
              r={model.r(p.size)}
              fill={p.highlight ? 'var(--lamp)' : 'var(--tide)'}
              fillOpacity={isSel ? 0.85 : 0.42}
              stroke={p.highlight ? 'var(--lamp)' : 'var(--tide)'}
              strokeWidth={isSel ? 2 : 1}
            />
            {/* 폰에서는 16개 이름표가 전부 겹쳐 읽을 수 없다.
                원도심(앰버)과 지금 선택한 점에만 붙이고, 나머지는 탭하면 나타난다. */}
            {(!mobile || p.highlight || isSel) && (
              <text
                x={model.x(p.x)}
                y={model.y(p.y) - model.r(p.size) - 7}
                textAnchor="middle"
                className="pointer-events-none font-sans text-[12px]"
                fill={p.highlight ? 'var(--lamp)' : '#ffffff'}
                fillOpacity={isSel ? 1 : 0.55}
              >
                {p.label}
              </text>
            )}
          </motion.g>
          </g>
        );
      })}

      {/* 상관계수 */}
      {model.r2 !== null && (
        <text x={M.left + PW - 4} y={M.top + 16} textAnchor="end" className="fill-paper/60 font-sans text-[14px]">
          r = {model.r2.toFixed(2)}
        </text>
      )}
    </svg>
  );
}
