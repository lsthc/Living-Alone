import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CountUp } from '@/components/CountUp';
import { EmptyState } from '@/components/EmptyState';
import { StoryCta } from '@/components/StoryNav';
import { WindowGrid } from '@/charts/WindowGrid';
import { rowsOf, useData } from '@/lib/DataProvider';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn, fmtInt, fmtManwon } from '@/lib/utils';

/**
 * 사각형 하나가 몇 가구인가 — 직접 바꿔 볼 수 있게 두 눈금을 준다.
 * 같은 18만이 칸을 잘게 쪼개면 얼마나 다르게 보이는지가 이 챕터의 유일한 논점이다.
 */
const SCALES = [
  { unit: 1000, label: '1칸 = 1,000가구', columns: 24, size: 14, gap: 6 },
  { unit: 100, label: '1칸 = 100가구', columns: 48, size: 7, gap: 3 },
] as const;

/**
 * Chapter 0 — 창문
 *
 * 심야 남색 화면에 사각형 격자가 아주 느리게 켜진다. 사각형 1개 = 독거노인 1,000가구.
 * 숫자 외의 설명은 넣지 않는다. 해석은 다음 챕터부터.
 *
 * 여기서 관람객이 할 수 있는 일은 셋뿐이다 — 칸 하나를 골라 세워 보기, 눈금 바꾸기,
 * 다시 켜기. 이 챕터에서 더 많은 것을 하게 만들면 첫 화면의 침묵이 깨진다.
 */
export function Ch0Window() {
  const { trend, loading } = useData();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();

  const [scaleIdx, setScaleIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  // 값이 바뀔 때마다 WindowGrid 를 새로 마운트해 처음부터 다시 켜지게 한다
  const [replay, setReplay] = useState(0);
  const scale = SCALES[scaleIdx];

  // 부산의 가장 최근 연도 독거노인 수
  const latest = rowsOf(trend)
    .filter((r) => r.region === '부산' && r.elderly_alone !== null)
    .sort((a, b) => b.year - a.year)[0];

  // 격자가 다 켜진 뒤에 카운터를 시작한다.
  // 폰에서는 4초를 다 기다리지 못하고 이탈한다 — 절반으로 줄인다.
  // 눈금을 바꿔도 이 값은 그대로 둔다. 제목이 다시 사라졌다 나타나면 안 된다.
  const [gridDuration] = useState(() => (reduced ? 0 : mobile ? 2200 : 4200));

  if (loading) {
    return <section id="ch0" className="flex min-h-full items-center justify-center" aria-busy="true" />;
  }

  if (!latest) {
    return (
      <section id="ch0" className="chapter flex min-h-full items-center justify-center">
        <EmptyState
          title="데이터 준비 중"
          detail="부산의 독거노인 수 자료를 아직 읽지 못했습니다. public/data/01_trend_national_busan.csv 를 확인해 주세요."
        />
      </section>
    );
  }

  const households = latest.elderly_alone!;
  const squares = Math.round(households / scale.unit);

  const pickRandom = () => {
    setPicked(Math.floor(Math.random() * squares));
  };

  return (
    <section
      id="ch0"
      className="relative flex min-h-full flex-col items-center justify-center px-5 py-10 md:px-6"
      aria-labelledby="ch0-heading"
    >
      <div className="flex w-full max-w-[1100px] flex-col items-center gap-10">
        <WindowGrid
          key={`${scale.unit}-${replay}`}
          count={squares}
          columns={scale.columns}
          size={scale.size}
          gap={scale.gap}
          duration={gridDuration || 4200}
          picked={picked}
          onPick={setPicked}
          label={`사각형 ${squares}개로 표현한 ${latest.year}년 부산의 독거노인 ${households.toLocaleString('ko-KR')}가구. 사각형 하나가 ${scale.unit}가구를 뜻한다.`}
          className="w-full max-w-[820px]"
        />

        {/* 격자를 만져 볼 수 있는 자리 */}
        <div className="present-hide flex w-full max-w-[820px] flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SCALES.map((s, i) => (
              <button
                key={s.unit}
                type="button"
                onClick={() => {
                  setScaleIdx(i);
                  setPicked(null);
                }}
                aria-pressed={i === scaleIdx}
                className={cn(
                  'num rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                  i === scaleIdx
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border text-muted hover:border-muted hover:text-body'
                )}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={pickRandom}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/60 hover:text-primary"
            >
              창문 하나 골라 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setReplay((v) => v + 1);
              }}
              className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-primary/60 hover:text-primary"
            >
              다시 켜기
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={picked === null ? 'hint' : `picked-${picked}-${scale.unit}`}
              className="min-h-[2.5rem] max-w-[52ch] text-center text-sm leading-relaxed text-muted"
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              role="status"
              aria-live="polite"
            >
              {picked === null ? (
                <>격자의 사각형을 하나 눌러 보세요. 그 칸 하나에 몇 분이 계신지 나옵니다.</>
              ) : (
                <>
                  <span className="num text-primary">{picked + 1}</span>번째 칸 하나에{' '}
                  <span className="num text-body">{fmtInt(scale.unit)}가구</span>가 들어 있습니다. 부산 전체에는
                  이런 칸이 <span className="num text-body">{fmtInt(squares)}개</span> 있습니다.
                </>
              )}
            </motion.p>
          </AnimatePresence>
        </div>

        <motion.div
          className="flex flex-col items-center gap-5 text-center"
          initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: gridDuration / 1000, ease: 'easeOut' }}
        >
          <h1 id="ch0-heading" className="text-display text-foreground">
            부산의 밤에 켜지는 불빛 중{' '}
            <span className="num whitespace-nowrap text-primary">
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

          <p className="num text-sm tracking-wide text-muted">
            {latest.year} · 부산 · 65세 이상 1인가구 {households.toLocaleString('ko-KR')}
          </p>
        </motion.div>

        {/* 다음 동선 — 처음 여는 사람에게 '눌러볼 곳'을 준다 */}
        <motion.div
          className="flex w-full max-w-[560px] flex-col gap-2.5 sm:flex-row"
          initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: gridDuration / 1000 + 0.8, ease: 'easeOut' }}
        >
          <StoryCta to="ch1" label="처음부터 순서대로" sub="가설 세 개를 데이터로 확인합니다" />
          <StoryCta
            to="ch4"
            variant="weak"
            label="혼자 계신 그분의 자리 찾기"
            sub="구·군과 연령을 고르면 그분의 자리가 보입니다"
          />
        </motion.div>

        <motion.p
          className="present-hide text-center text-xs text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: gridDuration / 1000 + 1.2 }}
        >
          챕터는 <span className="num">←</span> <span className="num">→</span> 키나 화면 좌우 버튼으로 넘깁니다 ·{' '}
          <span className="num">B</span> 를 누르면 챕터 목록
        </motion.p>
      </div>
    </section>
  );
}
