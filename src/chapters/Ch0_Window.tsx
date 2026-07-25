import { motion, useReducedMotion } from 'framer-motion';
import { CountUp } from '@/components/CountUp';
import { EmptyState } from '@/components/EmptyState';
import { WindowGrid } from '@/charts/WindowGrid';
import { rowsOf, useData } from '@/lib/DataProvider';
import { fmtManwon } from '@/lib/utils';

/** 사각형 하나가 뜻하는 가구 수 */
const UNIT = 1000;

/**
 * Chapter 0 — 창문
 *
 * 심야 남색 화면에 사각형 격자가 아주 느리게 켜진다. 사각형 1개 = 독거노인 1,000가구.
 * 숫자 외의 설명은 넣지 않는다. 해석은 다음 챕터부터.
 */
export function Ch0Window() {
  const { trend, loading } = useData();
  const reduced = useReducedMotion();

  // 부산의 가장 최근 연도 독거노인 수
  const latest = rowsOf(trend)
    .filter((r) => r.region === '부산' && r.elderly_alone !== null)
    .sort((a, b) => b.year - a.year)[0];

  if (loading) {
    return <section id="ch0" className="flex min-h-screen items-center justify-center" aria-busy="true" />;
  }

  if (!latest) {
    return (
      <section id="ch0" className="chapter flex min-h-screen items-center justify-center">
        <EmptyState
          title="데이터 준비 중"
          detail="부산의 독거노인 수 자료를 아직 읽지 못했습니다. public/data/01_trend_national_busan.csv 를 확인해 주세요."
        />
      </section>
    );
  }

  const households = latest.elderly_alone!;
  const squares = Math.round(households / UNIT);
  // 격자가 다 켜진 뒤에 카운터를 시작한다
  const gridDuration = reduced ? 0 : 4200;

  return (
    <section
      id="ch0"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24"
      aria-labelledby="ch0-heading"
    >
      <div className="flex w-full max-w-[1100px] flex-col items-center gap-14">
        <WindowGrid
          count={squares}
          label={`사각형 ${squares}개로 표현한 ${latest.year}년 부산의 독거노인 ${households.toLocaleString('ko-KR')}가구. 사각형 하나가 ${UNIT}가구를 뜻한다.`}
          className="w-full max-w-[820px]"
        />

        <motion.div
          className="flex flex-col items-center gap-6 text-center"
          initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: gridDuration / 1000, ease: 'easeOut' }}
        >
          <h1 id="ch0-heading" className="font-serif text-display text-paper">
            부산의 밤에 켜지는 불빛 중{' '}
            <span className="num text-lamp">
              <CountUp
                to={households}
                delay={gridDuration + 200}
                duration={2600}
                format={(v) => fmtManwon(v)}
              />
            </span>
            개는,
            <br />
            혼자 켜집니다.
          </h1>

          <p className="num text-sm tracking-wide text-paper/45">
            {latest.year} · 부산 · 65세 이상 1인가구 {households.toLocaleString('ko-KR')}
          </p>
        </motion.div>
      </div>

      {/* 스크롤 유도 인디케이터 (발표 모드에서는 숨긴다) */}
      <motion.div
        className="present-hide absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: gridDuration / 1000 + 1.2 }}
        aria-hidden
      >
        <motion.div
          className="h-10 w-px bg-gradient-to-b from-transparent via-lamp/60 to-transparent"
          animate={reduced ? {} : { y: [0, 10, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}
