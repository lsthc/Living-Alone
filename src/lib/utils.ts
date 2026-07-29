import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge 는 기본 스케일(text-sm/lg/xl…)만 글자 크기로 안다.
 * Lux 에서 가져온 타이포 토큰(text-h1~h4, text-body-sm, text-display, text-headline)은
 * 모르는 값이라 색상 클래스로 오인하고, 같은 cn() 안의 text-foreground 같은 색과
 * 충돌 처리해 크기 쪽을 지워버린다.
 *
 * text-body 는 fontSize 와 color 양쪽에 정의돼 있어 모호하므로 등록하지 않는다 —
 * 이 코드베이스에서는 대부분 색으로 쓴다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'h4', 'body-sm', 'display', 'headline'] }],
    },
  },
});

/** Tailwind 클래스를 안전하게 합친다 (shadcn/ui 관례) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── 숫자 포맷 ──────────────────────────────────────────────────────────────
// 모든 숫자는 화면에서 tabular-nums 로 표시한다. 값이 바뀌어도 자릿수가 흔들리지 않게.

/** 12345 → '12,345' · null → '—' */
export const fmtInt = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('ko-KR');

/** 23.45 → '23.5%' · null → '—' */
export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`;

/** 1.47 → '1.47배' */
export const fmtRatio = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}배`;

/** 231223 → '23만 1,223' — Chapter 0 카운터처럼 큰 수를 읽기 쉽게 */
export function fmtManwon(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const n = Math.round(v);
  if (n < 10000) return n.toLocaleString('ko-KR');
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  return rest === 0 ? `${man}만` : `${man}만 ${rest.toLocaleString('ko-KR')}`;
}

/** prefers-reduced-motion 을 존중하는지 확인 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
