import { motion, useReducedMotion } from 'framer-motion';
import { useReveal } from '@/lib/useReveal';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * 지수 추세 차트 — 이 앱의 시그니처 화면.
 *
 * Chapter 0 의 창문 격자가 흩어져 이 꺾은선으로 재조립된다.
 * 격자 → 선. 모티프는 하나뿐이고 형태만 바뀐다.
 *
 * Recharts 대신 직접 SVG 를 그린다. 격자 사각형이 정확히 선 위에 내려앉으려면
 * 두 그림이 같은 좌표계를 써야 하기 때문이다.
 */

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  /** 전국 비교선은 점선으로 */
  dashed?: boolean;
  points: { year: number; value: number }[];
}

const W = 1000;
const H = 460;
const M = { top: 28, right: 116, bottom: 46, left: 56 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

/** 각 계열을 자기 첫 연도 = 100 으로 지수화한다. */
export function toIndex(points: { year: number; value: number }[]) {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  const base = sorted[0]?.value;
  if (!base) return [];
  return sorted.map((p) => ({ year: p.year, index: (p.value / base) * 100 }));
}

/** 폴리라인 위에서 길이 비율 t(0~1) 지점의 좌표를 구한다. 격자→선 모션에 쓴다. */
function pointAt(path: { x: number; y: number }[], t: number) {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  const segs = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  const total = segs.reduce((a, b) => a + b, 0);
  if (total === 0) return path[0];
  let want = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i]) {
      const r = segs[i] === 0 ? 0 : want / segs[i];
      return { x: path[i].x + (path[i + 1].x - path[i].x) * r, y: path[i].y + (path[i + 1].y - path[i].y) * r };
    }
    want -= segs[i];
  }
  return path[path.length - 1];
}

export function IndexTrend({
  series,
  activeYear,
  /** 격자에서 선으로 재조립되는 모션을 이 계열 위에서 수행한다 */
  morphSeriesKey,
  squareCount = 96,
  yAxisLabel = '지수',
  ariaLabel,
}: {
  series: TrendSeries[];
  activeYear?: number;
  morphSeriesKey?: string;
  squareCount?: number;
  yAxisLabel?: string;
  ariaLabel: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useReveal(ref, 0.3);
  const reduced = useReducedMotion();
  // 0 격자 / 1 선 위로 이동 / 2 선이 그려지고 축이 나타남
  const [phase, setPhase] = useState(reduced ? 2 : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const a = window.setTimeout(() => setPhase(1), 350);
    const b = window.setTimeout(() => setPhase(2), 1350);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [inView, reduced]);

  const indexed = useMemo(
    () => series.map((s) => ({ ...s, data: toIndex(s.points) })).filter((s) => s.data.length > 1),
    [series]
  );

  const scale = useMemo(() => {
    const years = indexed.flatMap((s) => s.data.map((d) => d.year));
    const values = indexed.flatMap((s) => s.data.map((d) => d.index));
    if (!years.length) return null;
    const x0 = Math.min(...years);
    const x1 = Math.max(...years);
    // 100(기준선)이 항상 보이도록 아래쪽을 100 아래로 살짝 연다
    const y1 = Math.max(...values, 100) * 1.06;
    const y0 = Math.min(...values, 100) * 0.94;
    return {
      x: (year: number) => M.left + ((year - x0) / Math.max(x1 - x0, 1)) * PW,
      y: (v: number) => M.top + PH - ((v - y0) / Math.max(y1 - y0, 1)) * PH,
      x0,
      x1,
      y0,
      y1,
    };
  }, [indexed]);

  const paths = useMemo(() => {
    if (!scale) return [];
    return indexed.map((s) => ({
      ...s,
      pts: s.data.map((d) => ({ x: scale.x(d.year), y: scale.y(d.index) })),
    }));
  }, [indexed, scale]);

  const morphPath = paths.find((p) => p.key === morphSeriesKey) ?? paths[0];

  // 격자 시작 위치 — 플롯 영역 가운데에 가지런히 놓는다
  const gridCols = 16;
  const gridSize = 12;
  const gridGap = 8;
  const gridW = gridCols * gridSize + (gridCols - 1) * gridGap;
  const gridRows = Math.ceil(squareCount / gridCols);
  const gridH = gridRows * gridSize + (gridRows - 1) * gridGap;
  const gridX = M.left + (PW - gridW) / 2;
  const gridY = M.top + (PH - gridH) / 2;

  if (!scale || paths.length === 0) return null;

  const yTicks = [scale.y0, (scale.y0 + scale.y1) / 2, scale.y1].map((v) => Math.round(v));
  const yearTicks = Array.from(new Set(indexed.flatMap((s) => s.data.map((d) => d.year)))).sort((a, b) => a - b);
  const tickEvery = Math.ceil(yearTicks.length / 8);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ── 축과 눈금 ── */}
      <motion.g animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 0.6 }}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + PW} y1={scale.y(v)} y2={scale.y(v)} stroke="#33465C" strokeWidth={1} />
            <text x={M.left - 10} y={scale.y(v) + 4} textAnchor="end" className="fill-paper/55 font-mono text-[13px]">
              {v}
            </text>
          </g>
        ))}
        {/* 기준선 100 — 여기가 출발점이라는 표시 */}
        <line
          x1={M.left}
          x2={M.left + PW}
          y1={scale.y(100)}
          y2={scale.y(100)}
          stroke="#EDE8DF"
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <text x={M.left - 10} y={scale.y(100) - 8} textAnchor="end" className="fill-paper/55 font-mono text-[12px]">
          {yAxisLabel}
        </text>

        {yearTicks
          .filter((_, i) => i % tickEvery === 0 || i === yearTicks.length - 1)
          .map((year) => (
            <text
              key={year}
              x={scale.x(year)}
              y={M.top + PH + 26}
              textAnchor="middle"
              className="fill-paper/55 font-mono text-[13px]"
            >
              {year}
            </text>
          ))}
      </motion.g>

      {/* ── 선 ── */}
      {paths.map((s) => (
        <motion.path
          key={s.key}
          d={s.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={s.dashed ? 2.5 : 3.5}
          strokeDasharray={s.dashed ? '7 7' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
          animate={{ pathLength: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut' }}
        />
      ))}

      {/* ── 실제로 값이 있는 연도에만 점을 찍는다.
             조사가 없어 비어 있는 구간(예: 2011~2014년)이 눈으로 보이도록. ── */}
      <motion.g animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.9 }}>
        {paths.map((s) =>
          s.pts.map((p, i) => (
            <circle key={`${s.key}-${i}`} cx={p.x} cy={p.y} r={2.5} fill={s.color} fillOpacity={0.9} />
          ))
        )}
      </motion.g>

      {/* ── 계열 이름 (선 오른쪽 끝에 직접 붙인다. 범례를 따로 두지 않는다) ── */}
      <motion.g animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
        {paths.map((s) => {
          const last = s.pts[s.pts.length - 1];
          return (
            <text key={s.key} x={last.x + 12} y={last.y + 5} className="font-sans text-[15px]" fill={s.color}>
              {s.label}
            </text>
          );
        })}
      </motion.g>

      {/* ── 선택한 연도의 세로 안내선과 값 ── */}
      {activeYear !== undefined && (
        <motion.g animate={{ opacity: phase >= 2 ? 1 : 0 }} transition={{ duration: 0.4 }}>
          <line
            x1={scale.x(activeYear)}
            x2={scale.x(activeYear)}
            y1={M.top}
            y2={M.top + PH}
            stroke="#EDE8DF"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
          {paths.map((s) => {
            const d = s.data.find((p) => p.year === activeYear);
            if (!d) return null;
            return (
              <g key={s.key}>
                <circle cx={scale.x(activeYear)} cy={scale.y(d.index)} r={5.5} fill={s.color} />
                <text
                  x={scale.x(activeYear)}
                  y={scale.y(d.index) - 14}
                  textAnchor="middle"
                  className="font-mono text-[14px]"
                  fill={s.color}
                >
                  {d.index.toFixed(0)}
                </text>
              </g>
            );
          })}
        </motion.g>
      )}

      {/* ── 격자 → 선 재조립 (시그니처 모션) ── */}
      {phase < 2 && morphPath && (
        <g aria-hidden>
          {Array.from({ length: squareCount }, (_, i) => {
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            const from = { x: gridX + col * (gridSize + gridGap), y: gridY + row * (gridSize + gridGap) };
            const to = pointAt(morphPath.pts, squareCount === 1 ? 0 : i / (squareCount - 1));
            const target = phase === 0 ? from : { x: to.x - gridSize / 2, y: to.y - gridSize / 2 };
            return (
              <motion.rect
                key={i}
                width={gridSize}
                height={gridSize}
                fill="var(--lamp)"
                initial={{ x: from.x, y: from.y, opacity: 0 }}
                animate={{
                  x: target.x,
                  y: target.y,
                  opacity: phase === 0 ? 0.85 : 0,
                  width: phase === 0 ? gridSize : 5,
                  height: phase === 0 ? gridSize : 5,
                }}
                transition={{
                  duration: phase === 0 ? 0.5 : 0.9,
                  delay: phase === 0 ? (i / squareCount) * 0.35 : (i / squareCount) * 0.25,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
