import { useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useReveal } from '@/lib/useReveal';
import { fmtInt } from '@/lib/utils';

/**
 * 인구 피라미드 — 왼쪽 남성, 오른쪽 여성.
 *
 * 격자 모티프가 여기서 마지막으로 변형된다. Chapter 0 의 창문 사각형이
 * 가로로 누워 나이대별 막대가 된다.
 *
 * ★ 막대 길이의 규칙: 넘겨받은 값들의 **합계를 100 으로 놓은 비율**이다.
 *   원자료의 공표 비율(분모가 다를 수 있다)을 그대로 쓰지 않고 여기서 다시 계산한다.
 *   그래야 서로 다른 두 표(고독사 / 1인세대)를 같은 규칙으로 나란히 놓을 수 있다.
 *   대신 '무엇을 100 으로 놓았는지'는 반드시 ChartFrame 의 caveat 에 적는다.
 */

export interface PyramidDatum {
  sex: '남' | '여';
  band: string;
  /** 원자료의 실측 건수. null 이면 '데이터 없음'으로 비워 둔다. */
  value: number | null;
}

/** 특정 칸 묶음에 괄호를 치고 이름표를 붙인다 (예: 50·60대 남성) */
export interface PyramidBracket {
  sex: '남' | '여';
  bands: string[];
  label: string;
}

const W = 520;
const H = 400;
const M = { top: 44, right: 14, bottom: 42, left: 14 };
const GAP = 88; // 가운데 연령 이름표가 들어갈 폭
const HALF = (W - M.left - M.right - GAP) / 2;
const PH = H - M.top - M.bottom;

const COLOR = { 남: 'var(--lamp)', 여: 'var(--tide)' } as const;

export function DemoPyramid({
  bands,
  data,
  unit,
  bracket,
  ariaLabel,
}: {
  /** 아래에서 위로 올라가는 순서 (예: 40대 → 80대이상) */
  bands: string[];
  data: PyramidDatum[];
  /** '명' · '세대' 등 */
  unit: string;
  bracket?: PyramidBracket;
  ariaLabel: string;
}) {
  const reduced = useReducedMotion();
  // 뷰포트 판정은 SVG 하나에서만 한다 (Scatter·DistrictMap 과 같은 이유)
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useReveal(svgRef, 0.15);
  const shown = reduced || inView;

  const model = useMemo(() => {
    const total = data.reduce((a, d) => a + (d.value ?? 0), 0);
    if (total <= 0) return null;

    const pctOf = (sex: '남' | '여', band: string) => {
      const v = data.find((d) => d.sex === sex && d.band === band)?.value ?? null;
      return v === null ? null : (v / total) * 100;
    };
    const valueOf = (sex: '남' | '여', band: string) =>
      data.find((d) => d.sex === sex && d.band === band)?.value ?? null;

    const maxPct = Math.max(...data.map((d) => (d.value ?? 0) / total)) * 100;
    const domain = maxPct * 1.08 || 1;

    const bandH = PH / bands.length;
    // bands 는 아래에서 위로. 화면은 위가 고령이므로 뒤집어 그린다.
    const rowY = (band: string) => {
      const i = bands.indexOf(band);
      return M.top + (bands.length - 1 - i) * bandH;
    };

    return { total, pctOf, valueOf, domain, bandH, rowY };
  }, [bands, data]);

  if (!model) return null;

  const centerL = M.left + HALF;
  const centerR = centerL + GAP;
  const barH = Math.min(34, model.bandH * 0.56);
  const len = (pct: number) => (pct / model.domain) * HALF;
  const ticks = [0.25, 0.5, 0.75, 1].map((f) => f * model.domain);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      {/* 눈금선 — 좌우 대칭 */}
      {ticks.map((t) => (
        <g key={t} aria-hidden>
          <line x1={centerL - len(t)} x2={centerL - len(t)} y1={M.top} y2={M.top + PH} stroke="#33465C" strokeWidth={1} strokeOpacity={0.35} />
          <line x1={centerR + len(t)} x2={centerR + len(t)} y1={M.top} y2={M.top + PH} stroke="#33465C" strokeWidth={1} strokeOpacity={0.35} />
          <text x={centerL - len(t)} y={M.top + PH + 20} textAnchor="middle" className="fill-paper/35 font-mono text-[11px]">
            {t.toFixed(0)}
          </text>
          <text x={centerR + len(t)} y={M.top + PH + 20} textAnchor="middle" className="fill-paper/35 font-mono text-[11px]">
            {t.toFixed(0)}
          </text>
        </g>
      ))}
      <text x={W / 2} y={M.top + PH + 36} textAnchor="middle" className="fill-paper/40 font-sans text-[11px]">
        가로축 단위 %
      </text>

      {/* 성별 이름표 */}
      <text x={centerL} y={M.top - 24} textAnchor="end" className="font-sans text-[14px]" fill="var(--lamp)">
        남성
      </text>
      <text x={centerR} y={M.top - 24} textAnchor="start" className="font-sans text-[14px]" fill="var(--tide)">
        여성
      </text>

      {/* 괄호 — 특정 묶음을 지목한다 */}
      {bracket &&
        (() => {
          const ys = bracket.bands.filter((b) => bands.includes(b)).map((b) => model.rowY(b));
          if (!ys.length) return null;
          const top = Math.min(...ys) + 2;
          const bottom = Math.max(...ys) + model.bandH - 2;
          const left = bracket.sex === '남';
          const bx = left ? M.left + 3 : W - M.right - 3;
          const tick = left ? 8 : -8;
          return (
            <motion.g
              aria-hidden
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: shown ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 1.1 }}
            >
              <path
                d={`M ${bx + tick} ${top} L ${bx} ${top} L ${bx} ${bottom} L ${bx + tick} ${bottom}`}
                fill="none"
                stroke="var(--paper)"
                strokeOpacity={0.45}
                strokeWidth={1.5}
              />
              <text
                x={bx}
                y={top - 9}
                textAnchor={left ? 'start' : 'end'}
                className="font-sans text-[12px]"
                fill="var(--paper)"
                fillOpacity={0.7}
              >
                {bracket.label}
              </text>
            </motion.g>
          );
        })()}

      {/* 막대 */}
      {bands.map((band, i) => {
        const y = model.rowY(band) + (model.bandH - barH) / 2;
        return (
          <g key={band}>
            {/* 가운데 연령 이름표 */}
            <text
              x={W / 2}
              y={y + barH / 2 + 5}
              textAnchor="middle"
              className="fill-paper/70 font-sans text-[13px]"
            >
              {band}
            </text>

            {(['남', '여'] as const).map((sex) => {
              const pct = model.pctOf(sex, band);
              const value = model.valueOf(sex, band);
              const left = sex === '남';

              if (pct === null) {
                return (
                  <text
                    key={sex}
                    x={left ? centerL - 8 : centerR + 8}
                    y={y + barH / 2 + 4}
                    textAnchor={left ? 'end' : 'start'}
                    className="fill-paper/30 font-mono text-[11px]"
                  >
                    데이터 없음
                  </text>
                );
              }

              const l = len(pct);
              // 막대가 길면 값을 안쪽에, 짧으면 바깥쪽에 쓴다
              const inside = l > HALF * 0.72;
              const labelX = left
                ? centerL - l + (inside ? 8 : -6)
                : centerR + l - (inside ? 8 : -6);

              return (
                <g key={sex}>
                  <motion.rect
                    x={left ? centerL - l : centerR}
                    y={y}
                    width={l}
                    height={barH}
                    fill={COLOR[sex]}
                    fillOpacity={0.72}
                    initial={{ scaleX: reduced ? 1 : 0 }}
                    animate={{ scaleX: shown ? 1 : 0 }}
                    style={{ transformOrigin: `${left ? centerL : centerR}px ${y}px` }}
                    transition={{
                      duration: reduced ? 0 : 0.65,
                      delay: reduced ? 0 : 0.12 + i * 0.09,
                      ease: 'easeOut',
                    }}
                  />
                  <motion.text
                    x={labelX}
                    y={y + barH / 2 + 4}
                    textAnchor={left ? (inside ? 'start' : 'end') : inside ? 'end' : 'start'}
                    className="num text-[12px]"
                    fill={inside ? 'var(--ink)' : 'var(--paper)'}
                    fillOpacity={inside ? 0.85 : 0.65}
                    initial={{ opacity: reduced ? 1 : 0 }}
                    animate={{ opacity: shown ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.5 + i * 0.09 }}
                  >
                    {pct.toFixed(1)}%
                  </motion.text>
                  {/* 스크린리더용 실측값 */}
                  <title>{`${band} ${sex}성 ${fmtInt(value)}${unit} (${pct.toFixed(1)}%)`}</title>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 가운데 세로선 */}
      <line x1={centerL} x2={centerL} y1={M.top} y2={M.top + PH} stroke="#33465C" strokeWidth={1} />
      <line x1={centerR} x2={centerR} y1={M.top} y2={M.top + PH} stroke="#33465C" strokeWidth={1} />
    </svg>
  );
}
