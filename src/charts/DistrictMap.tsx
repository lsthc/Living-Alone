import { useMemo, useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { motion, useReducedMotion } from 'framer-motion';
import { useReveal } from '@/lib/useReveal';
import type { BusanGeoJson, DistrictRow } from '@/data/schema';
import { cn } from '@/lib/utils';

/**
 * 부산 16개 구·군 코로플레스 지도.
 *
 * 색은 어두운 회청 → 밝은 파랑(TDS primary) 한 방향으로만 간다.
 * 고립이 심한 곳일수록 창문처럼 밝게 켜진다 — Chapter 0 의 격자와 같은 은유다.
 * 위험을 뜻하는 빨강은 쓰지 않는다.
 */

const LOW = [107, 118, 132]; //  --muted #6b7684
const HIGH = [49, 130, 246]; // --primary  #3182f6

/** 0~1 값을 회청 → 파랑 사이 색으로 바꾼다. */
export function rampColor(t: number) {
  const c = LOW.map((lo, i) => Math.round(lo + (HIGH[i] - lo) * Math.min(Math.max(t, 0), 1)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function DistrictMap({
  geo,
  rows,
  /** 어떤 값으로 색을 칠할지 */
  valueOf,
  /** 원도심 5개구만 남기고 나머지를 흐리게 */
  onlyOldDowntown = false,
  selected,
  onSelect,
  interactionMode = 'hover',
  ariaLabel,
  className,
}: {
  geo: BusanGeoJson;
  rows: DistrictRow[];
  valueOf: (row: DistrictRow) => number | null;
  onlyOldDowntown?: boolean;
  selected?: string | null;
  onSelect?: (code: string | null) => void;
  /**
   * hover — 마우스를 올리면 선택되고 다시 누르면 해제된다 (데스크톱).
   * tap  — 올려서 선택되는 일이 없고, 누르면 언제나 그 구가 선택된다 (폰).
   *
   * 폰에서 hover 를 쓰면 한 번 탭할 때 mouseenter 와 click 이 잇달아 들어와,
   * 방금 선택된 구를 같은 탭이 곧바로 해제해 버린다(시트가 열렸다 닫힌다).
   */
  interactionMode?: 'hover' | 'tap';
  ariaLabel: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  // 뷰포트 판정은 SVG 하나에서만 한다.
  // 구마다 whileInView 를 걸면 SVG 자식 요소의 교차 판정이 어긋나 흐려지지 않아야 할 구까지 흐려진다.
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useReveal(svgRef, 0.15);
  const shown = reduced || inView;
  const W = 760;
  const H = 560;

  const byCode = useMemo(() => new Map(rows.map((r) => [r.sgg_code, r])), [rows]);

  const { pathFor, domain } = useMemo(() => {
    // 부산 경계에 딱 맞게 투영을 자동 조정한다
    const projection = geoMercator().fitExtent(
      [
        [24, 24],
        [W - 24, H - 24],
      ],
      geo as never
    );
    const path = geoPath(projection);
    const values = rows.map(valueOf).filter((v): v is number => v !== null);
    return {
      pathFor: (f: unknown) => path(f as never) ?? '',
      domain: values.length ? { min: Math.min(...values), max: Math.max(...values) } : null,
    };
  }, [geo, rows, valueOf]);

  const norm = (v: number | null) => {
    if (v === null || !domain || domain.max === domain.min) return null;
    return (v - domain.min) / (domain.max - domain.min);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      <g>
        {geo.features.map((f, i) => {
          const code = f.properties.sgg_code;
          const row = byCode.get(code);
          const value = row ? valueOf(row) : null;
          const t = norm(value);
          const isOld = f.properties.is_old_downtown;
          const dimmed = onlyOldDowntown && !isOld;
          const isSelected = selected === code;
          const hover = interactionMode === 'hover';
          const activate = () => onSelect?.(hover && isSelected ? null : code);

          // 상호작용은 일반 <g> 가 맡고, motion.path 는 그리기만 한다.
          // framer-motion 컴포넌트에 직접 onFocus/onMouseEnter 를 달면
          // 제스처 시스템이 가로채 핸들러가 호출되지 않는다(키보드 이동이 먹통이 된다).
          return (
            <g
              key={code}
              tabIndex={0}
              role="button"
              aria-label={`${f.properties.sgg_name}${value !== null ? `, ${value}` : ', 값 없음'}`}
              className="cursor-pointer outline-none"
              onMouseEnter={hover ? () => onSelect?.(code) : undefined}
              onFocus={hover ? () => onSelect?.(code) : undefined}
              onClick={activate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  activate();
                }
              }}
            >
              <motion.path
                d={pathFor(f)}
                // 값이 없는 구는 색을 칠하지 않는다. 0 으로 취급하지 않는다.
                fill={t === null ? 'transparent' : rampColor(t)}
                stroke={isSelected ? '#ffffff' : 'var(--border)'}
                strokeWidth={isSelected ? 2.5 : 1.2}
                initial={{ opacity: reduced ? 1 : 0 }}
                animate={{ opacity: shown ? (dimmed ? 0.18 : 1) : 0 }}
                transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.03, ease: 'easeOut' }}
              />
            </g>
          );
        })}
      </g>

      {/* 값이 없는 구가 있으면 빗금 대신 얇은 테두리만 남는다 — 지어내지 않는다는 표시 */}
      <g aria-hidden>
        {geo.features.map((f) => {
          const row = byCode.get(f.properties.sgg_code);
          const value = row ? valueOf(row) : null;
          if (value !== null) return null;
          return (
            <path
              key={`empty-${f.properties.sgg_code}`}
              d={pathFor(f)}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        })}
      </g>
    </svg>
  );
}

/** 지도 옆에 두는 색 범례. 격자 모티프를 유지하려고 사각형으로 그린다. */
export function MapLegend({ min, max, unit = '%' }: { min: number; max: number; unit?: string }) {
  const steps = 12;
  return (
    <div className="flex items-center gap-3">
      <span className="num text-xs text-muted">
        {min.toFixed(1)}
        {unit}
      </span>
      <div className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: steps }, (_, i) => (
          <span
            key={i}
            className="block h-3.5 w-3.5"
            style={{ backgroundColor: rampColor(i / (steps - 1)) }}
          />
        ))}
      </div>
      <span className="num text-xs text-muted">
        {max.toFixed(1)}
        {unit}
      </span>
    </div>
  );
}
