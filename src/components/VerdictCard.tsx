import { motion, useReducedMotion } from 'framer-motion';
import type { HypothesisResult, Verdict } from '@/lib/hypothesis';
import { cn } from '@/lib/utils';

/**
 * 가설 판정 카드.
 *
 * 판정은 `src/lib/hypothesis.ts` 가 데이터로부터 계산한다. 이 컴포넌트는 그리기만 한다.
 * 기각이나 검증불가여도 그대로 보여준다. 그 정직함이 이 발표의 설득력이다.
 */

const STYLE: Record<Verdict, { label: string; badge: string; rule: string }> = {
  채택: { label: '가설 채택', badge: 'bg-lamp/15 text-lamp border-lamp/40', rule: 'bg-lamp/50' },
  부분채택: { label: '가설 부분 채택', badge: 'bg-tide/15 text-tide border-tide/40', rule: 'bg-tide/50' },
  기각: { label: '가설 기각', badge: 'bg-slate/25 text-paper/70 border-slate', rule: 'bg-slate' },
  검증불가: { label: '검증 불가', badge: 'bg-slate/25 text-paper/70 border-slate', rule: 'bg-slate' },
};

export function VerdictCard({ result, className }: { result: HypothesisResult<never>; className?: string }) {
  const reduced = useReducedMotion();
  const style = STYLE[result.verdict];

  return (
    <motion.section
      className={cn('relative overflow-hidden rounded-lg border border-slate/50 bg-ink/60 p-7 md:p-9', className)}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      aria-label={`${result.id} ${result.title} — ${style.label}`}
    >
      {/* 카드 왼쪽의 얇은 색 띠가 판정 종류를 나타낸다 */}
      <span className={cn('absolute left-0 top-0 h-full w-1', style.rule)} aria-hidden />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="num text-xs tracking-[0.2em] text-paper/40">{result.id}</span>
          <span className={cn('rounded-full border px-3 py-1 text-sm font-medium', style.badge)}>{style.label}</span>
        </div>

        <p className="num text-base leading-relaxed text-paper/85 md:text-lg">{result.evidence}</p>

        <p className="max-w-[68ch] text-sm leading-relaxed text-paper/60 md:text-base">{result.interpretation}</p>
      </div>
    </motion.section>
  );
}
