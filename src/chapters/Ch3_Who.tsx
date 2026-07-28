import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChartFrame } from '@/components/ChartFrame';
import { EmptyState } from '@/components/EmptyState';
import { UpNext } from '@/components/deck/UpNext';
import { VerdictCard } from '@/components/VerdictCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SwipeDeck } from '@/components/ui/SwipeDeck';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { DemoPyramid, type PyramidDatum } from '@/charts/DemoPyramid';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH3 } from '@/lib/hypothesis';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn, fmtInt } from '@/lib/utils';
import type { AgeBand } from '@/data/schema';

/** 아래에서 위로 올라가는 순서. 원자료의 공표 구간을 그대로 쓴다. */
const BANDS: AgeBand[] = ['40대', '50대', '60대', '70대', '80대이상'];

/** 합계를 100 으로 놓았을 때 특정 칸이 차지하는 비율 */
function shareOf(data: PyramidDatum[], pick: (d: PyramidDatum) => boolean) {
  const total = data.reduce((a, d) => a + (d.value ?? 0), 0);
  if (total <= 0) return null;
  const part = data.filter(pick).reduce((a, d) => a + (d.value ?? 0), 0);
  return (part / total) * 100;
}

/** 가장 큰 칸 하나 */
function topCell(data: PyramidDatum[]) {
  const withValue = data.filter((d) => d.value !== null);
  if (!withValue.length) return null;
  const best = withValue.reduce((a, b) => (b.value! > a.value! ? b : a));
  return { ...best, share: shareOf(data, (d) => d.sex === best.sex && d.band === best.band) };
}

/**
 * 붙어 있는 두 연령대 × 같은 성별 가운데 합이 가장 큰 묶음.
 * 어디에 괄호를 칠지 사람이 정하지 않고 데이터가 정하게 한다.
 */
function topAdjacentPair(data: PyramidDatum[]) {
  let best: { sex: '남' | '여'; bands: AgeBand[]; share: number } | null = null;
  for (const sex of ['남', '여'] as const) {
    for (let i = 0; i < BANDS.length - 1; i++) {
      const pair = [BANDS[i], BANDS[i + 1]];
      const share = shareOf(data, (d) => d.sex === sex && pair.includes(d.band as AgeBand));
      if (share !== null && (!best || share > best.share)) best = { sex, bands: pair, share };
    }
  }
  return best;
}

/**
 * Chapter 3 — H3: 누가 혼자 떠나는가
 *
 * 이 챕터는 '검증불가'를 정면으로 보여주는 자리다.
 * 부산의 성별×연령 고독사 교차표는 공표되지 않는다. 추정치를 만들어 채우지 않고,
 * 전국 고독사 피라미드 옆에 부산의 독거(1인세대) 구조를 나란히 놓는다.
 * 두 그림은 서로 다른 지표이며, 그 사실 자체를 화면에 적는다.
 */
export function Ch3Who() {
  const { demo, singleDemo, loading } = useData();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();

  const demoRows = rowsOf(demo);
  const singleRows = rowsOf(singleDemo);

  // 두 표에 모두 있는 연도만 고른다. 같은 해끼리 나란히 놓아야 의미가 있다.
  const years = useMemo(() => {
    const a = new Set(demoRows.filter((r) => r.region === '전국').map((r) => r.year));
    const b = new Set(singleRows.filter((r) => r.region === '부산').map((r) => r.year));
    return [...a].filter((y) => b.has(y)).sort((x, y) => x - y);
  }, [demoRows, singleRows]);

  const [picked, setPicked] = useState<number | null>(null);
  const year = picked ?? years[years.length - 1] ?? null;

  /** 한쪽 성별만 남기고 보기 — 두 그림의 모양 차이는 한쪽씩 지워야 눈에 들어온다 */
  const [focusSex, setFocusSex] = useState<'남' | '여' | null>(null);

  /**
   * 먼저 맞혀 보기.
   *
   * 이 챕터의 핵심은 '혼자 사는 사람'과 '혼자 죽는 사람'이 어긋난다는 것이다.
   * 그림을 먼저 보면 그 어긋남이 당연해 보이지만, 답을 적어 놓고 보면 놀란다.
   * 그래서 접어 둔 카드로 두고, 열어 본 사람만 답한다.
   */
  const [quizOpen, setQuizOpen] = useState(false);
  const [guess, setGuess] = useState<{ sex: '남' | '여'; band: AgeBand } | null>(null);

  const deathData: PyramidDatum[] = useMemo(
    () =>
      demoRows
        .filter((r) => r.region === '전국' && r.year === year)
        .map((r) => ({ sex: r.sex, band: r.age_band, value: r.deaths })),
    [demoRows, year]
  );

  const aloneData: PyramidDatum[] = useMemo(
    () =>
      singleRows
        .filter((r) => r.region === '부산' && r.year === year)
        .map((r) => ({ sex: r.sex, band: r.age_band, value: r.households })),
    [singleRows, year]
  );

  const verdict = useMemo(() => judgeH3(demoRows), [demoRows]);

  const deathPair = useMemo(() => topAdjacentPair(deathData), [deathData]);
  const alonePair = useMemo(() => topAdjacentPair(aloneData), [aloneData]);
  const deathTop = useMemo(() => topCell(deathData), [deathData]);
  const aloneTop = useMemo(() => topCell(aloneData), [aloneData]);

  // 원자료가 공표한 비율(분모 = 연령미상까지 포함한 전체 고독사).
  // 피라미드의 비율(분모 = 40대 이상 10칸)과 값이 다르므로 화면에 나란히 밝혀 둔다.
  const deathPairPublished = useMemo(() => {
    if (!deathPair) return null;
    const rows = demoRows.filter(
      (r) =>
        r.region === '전국' &&
        r.year === year &&
        r.sex === deathPair.sex &&
        deathPair.bands.includes(r.age_band) &&
        r.share_pct !== null
    );
    return rows.length ? rows.reduce((a, r) => a + r.share_pct!, 0) : null;
  }, [demoRows, year, deathPair]);

  const deathTotal = deathData.reduce((a, d) => a + (d.value ?? 0), 0);
  const aloneTotal = aloneData.reduce((a, d) => a + (d.value ?? 0), 0);

  if (loading) return <section id="ch3" className="chapter min-h-full" aria-busy="true" />;

  const hasData = deathData.length > 0 && aloneData.length > 0;
  // 두 그림에서 가장 두꺼운 칸이 서로 다른 성별인가 — 이 챕터의 핵심 문장이 여기서 갈린다
  const sexDiffers = !!deathTop && !!aloneTop && deathTop.sex !== aloneTop.sex;

  /**
   * 퀴즈 본문. 넓은 화면에서는 카드 안에서 펼치고, 폰에서는 시트 안에 그대로 들어간다.
   * 같은 내용을 두 벌 쓰지 않으려고 한 번만 만들어 두 자리에서 쓴다.
   */
  const quizBody = deathTop ? (
    <div className="flex flex-col gap-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        {(['남', '여'] as const).map((sex) => (
          <div key={sex} className="flex flex-col gap-1.5">
            <span className="text-xs text-paper/55">{sex}성</span>
            {BANDS.map((band) => {
              const mine = guess?.sex === sex && guess.band === band;
              const answer = deathTop.sex === sex && deathTop.band === band;
              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => setGuess({ sex, band })}
                  aria-pressed={mine}
                  className={cn(
                    'min-h-[44px] rounded-md border px-3 text-sm transition-colors',
                    guess && answer
                      ? 'border-lamp bg-lamp/20 text-lamp'
                      : mine
                        ? 'border-rust/60 bg-rust/10 text-paper/85'
                        : 'border-slate/50 text-paper/60 hover:border-slate hover:text-paper/85'
                  )}
                >
                  {band}
                  {guess && answer && <span className="ml-2 text-xs">정답</span>}
                  {guess && mine && !answer && <span className="ml-2 text-xs text-paper/55">내 답</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {guess && (
        <p className="text-sm leading-relaxed text-paper/70">
          {guess.sex === deathTop.sex && guess.band === deathTop.band ? (
            <>
              맞혔습니다.{' '}
              <span className="num text-lamp">
                {deathTop.band} {deathTop.sex}성
              </span>
              이 {year}년 전국 고독사에서 가장 두꺼운 칸입니다
              {deathTop.share !== null && (
                <>
                  {' '}
                  (40대 이상 합계의 <span className="num">{deathTop.share.toFixed(1)}%</span>)
                </>
              )}
              .
            </>
          ) : (
            <>
              고르신 칸은{' '}
              <span className="num text-paper/85">
                {guess.band} {guess.sex}성
              </span>
              입니다. 실제로 가장 두꺼운 칸은{' '}
              <span className="num text-lamp">
                {deathTop.band} {deathTop.sex}성
              </span>
              이었습니다
              {deathTop.share !== null && (
                <>
                  {' '}
                  (40대 이상 합계의 <span className="num">{deathTop.share.toFixed(1)}%</span>)
                </>
              )}
              . 많은 분이 여기서 한 번 놀랍니다.
            </>
          )}{' '}
          아래 두 그림에서 그 칸을 직접 확인해 보세요.
        </p>
      )}
    </div>
  ) : null;

  return (
    <section id="ch3" className="chapter flex flex-col gap-10 md:gap-14" aria-labelledby="ch3-heading">
      <header className="flex max-w-[70ch] flex-col gap-4">
        <span className="num text-xs tracking-[0.25em] text-lamp/70">CHAPTER 3 · 가설 H3</span>
        <h2 id="ch3-heading" className="font-serif text-headline text-paper">
          <BlurText text="누가 혼자 떠나는가" />
        </h2>
        <ScrollRevealText className="leading-relaxed text-paper/60">
          앞의 두 장에서 <em className="not-italic text-paper/90">얼마나</em>와{' '}
          <em className="not-italic text-paper/90">어디서</em>를 확인했습니다. 남은 질문은 누구인가입니다. 그런데
          여기서 우리 연구는 벽에 부딪혔습니다. 부산만 따로 본 성별·연령대별 고독사 표는 공표되지 않습니다. 없는
          숫자를 만들어 넣는 대신, 있는 것과 없는 것을 그대로 보여드립니다.
        </ScrollRevealText>
      </header>

      {!hasData || year === null ? (
        <EmptyState
          title="데이터 준비 중"
          detail="성별·연령대별 고독사 또는 1인세대 자료를 읽지 못했습니다. public/data/04_lonely_death_demo.csv 와 05_single_household_demo.csv 를 확인해 주세요."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {/* 연도 전환 */}
            {years.length > 1 && (
              <div role="tablist" aria-label="연도 선택" className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    role="tab"
                    aria-selected={y === year}
                    onClick={() => setPicked(y)}
                    className={cn(
                      'num rounded-full border px-4 py-2 text-sm transition-colors',
                      y === year
                        ? 'border-lamp/60 bg-lamp/15 text-lamp'
                        : 'border-slate/60 text-paper/55 hover:border-slate hover:text-paper/80'
                    )}
                  >
                    {y}년
                  </button>
                ))}
              </div>
            )}

            {/* 성별 강조 — 두 피라미드에 동시에 걸린다 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-paper/55">한쪽만 보기</span>
              {([null, '남', '여'] as const).map((s) => (
                <button
                  key={s ?? 'all'}
                  type="button"
                  onClick={() => setFocusSex(s)}
                  aria-pressed={focusSex === s}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    focusSex === s
                      ? 'border-lamp/60 bg-lamp/15 text-lamp'
                      : 'border-slate/60 text-paper/55 hover:border-slate hover:text-paper/80'
                  )}
                >
                  {s === null ? '둘 다' : `${s}성만`}
                </button>
              ))}
            </div>
          </div>

          {/* 먼저 맞혀 보기 — 폰에서는 아래에서 시트로 올라온다 */}
          {deathTop && (
            <div className="flex max-w-[74ch] flex-col gap-4 rounded-lg border border-slate/50 bg-ink/50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-serif text-lg text-paper/85">
                  아래 그림을 보기 전에 — {year}년 전국에서 혼자 떠난 분이 가장 많은 칸은 어디일까요
                </h3>
                {!(quizOpen && !mobile) && (
                  <button
                    type="button"
                    onClick={() => setQuizOpen(true)}
                    className="min-h-[44px] shrink-0 rounded-full border border-lamp/50 px-4 text-sm text-lamp transition-colors hover:bg-lamp/15"
                  >
                    {guess ? '다시 맞혀 보기' : '맞혀 보기'}
                  </button>
                )}
              </div>

              {/* 넓은 화면 — 카드 안에서 펼친다 */}
              {!mobile && (
                <AnimatePresence initial={false}>
                  {quizOpen && (
                    <motion.div
                      className="overflow-hidden"
                      initial={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
                    >
                      {quizBody}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* 폰 — 아래에서 올라오는 시트 */}
              {mobile && (
                <BottomSheet
                  open={quizOpen}
                  onClose={() => setQuizOpen(false)}
                  tone="dark"
                  title="가장 두꺼운 칸은 어디일까요"
                  subtitle={`${year}년 전국 고독사 · 성별과 연령대를 하나 골라 주세요`}
                  footer={
                    guess ? (
                      <button
                        type="button"
                        onClick={() => setQuizOpen(false)}
                        className="flex min-h-[56px] w-full items-center justify-center rounded-lg bg-lamp text-[17px] font-semibold text-paper transition-colors active:bg-[#2272eb]"
                      >
                        그림에서 확인하기
                      </button>
                    ) : undefined
                  }
                >
                  {quizBody}
                </BottomSheet>
              )}
            </div>
          )}

          {/* 두 그림은 나란히 놓고 모양을 비교하는 것이 핵심이라, 넓은 화면에서는 2열로 둔다.
              폰에서는 세로로 쌓으면 두 번째 그림을 아무도 못 보므로 밀어서 넘긴다. */}
          <SwipeDeck labels={['전국 고독사', '부산 1인세대']} desktopClassName="grid gap-10 lg:grid-cols-2">
            {/* 왼쪽 — 전국 고독사 */}
            <ChartFrame
              title={`${year}년 전국 고독사`}
              subtitle="공표된 것: 전국. 공표되지 않은 것: 부산."
              summary={
                deathPair
                  ? `${year}년 전국 고독사 ${fmtInt(deathTotal)}명(40대 이상) 가운데 ${deathPair.bands.join('·')} ${deathPair.sex}성이 ${deathPair.share.toFixed(1)}%로 가장 큰 비중을 차지합니다.`
                  : `${year}년 전국 고독사의 성별·연령 구조입니다.`
              }
              sourceIds={
                year >= 2024 ? ['mohw_lonely_2025release', 'mohw_lonely_2024survey'] : ['mohw_lonely_2024survey']
              }
              caveat="40대 미만과 연령미상은 원자료에 이 구간과 같은 방식으로 공표되지 않아 그림에서 빠졌습니다. 막대 길이는 그림에 실린 10개 칸의 합계를 100으로 놓고 이 연구가 다시 계산한 비율이라, 보도자료의 전체 대비 비율과는 분모가 다릅니다."
            >
              <DemoPyramid
                bands={BANDS}
                data={deathData}
                unit="명"
                bracket={
                  deathPair
                    ? {
                        sex: deathPair.sex,
                        bands: deathPair.bands,
                        label: `${deathPair.bands.join('·')} ${deathPair.sex}성 ${deathPair.share.toFixed(1)}%`,
                      }
                    : undefined
                }
                mobile={mobile}
                focusSex={focusSex}
                ariaLabel={`${year}년 전국 고독사 사망자의 성별·연령대 구조 피라미드`}
              />
              <p className="mt-3 text-center text-sm text-paper/55">
                합계 <span className="num text-paper/70">{fmtInt(deathTotal)}</span>명 · 40대 이상
              </p>
              {deathPair && deathPairPublished !== null && (
                <p className="mt-2 text-center text-sm leading-relaxed text-paper/60">
                  같은 묶음을 보도자료 기준(연령미상까지 포함한 전체 고독사 대비)으로 세면{' '}
                  <span className="num text-paper/60">{deathPairPublished.toFixed(1)}%</span>입니다. 아래 판정
                  카드의 숫자가 이 기준입니다.
                </p>
              )}
            </ChartFrame>

            {/* 오른쪽 — 부산 1인세대 */}
            <ChartFrame
              title={`${year}년 부산 1인세대`}
              subtitle="부산에서 확인할 수 있는 가장 가까운 실측 자료."
              summary={
                alonePair
                  ? `${year}년 부산의 40대 이상 1인세대 ${fmtInt(aloneTotal)}세대 가운데 ${alonePair.bands.join('·')} ${alonePair.sex}성이 ${alonePair.share.toFixed(1)}%로 가장 큽니다.`
                  : `${year}년 부산 1인세대의 성별·연령 구조입니다.`
              }
              sourceIds={['mois_single_age']}
              caveat="이것은 고독사 통계가 아니라 혼자 사는 세대의 통계입니다. 혼자 산다는 것이 고독사를 뜻하지 않습니다. 왼쪽 그림과 분모도 대상도 다르므로 두 그림의 숫자를 서로 빼거나 나눌 수 없습니다. 나란히 놓고 모양만 비교하는 용도입니다. 40대 미만 1인세대도 제외했습니다."
            >
              <DemoPyramid
                bands={BANDS}
                data={aloneData}
                unit="세대"
                bracket={
                  alonePair
                    ? {
                        sex: alonePair.sex,
                        bands: alonePair.bands,
                        label: `${alonePair.bands.join('·')} ${alonePair.sex}성 ${alonePair.share.toFixed(1)}%`,
                      }
                    : undefined
                }
                mobile={mobile}
                focusSex={focusSex}
                ariaLabel={`${year}년 부산 1인세대의 성별·연령대 구조 피라미드`}
              />
              <p className="mt-3 text-center text-sm text-paper/55">
                합계 <span className="num text-paper/70">{fmtInt(aloneTotal)}</span>세대 · 40대 이상
              </p>
            </ChartFrame>
          </SwipeDeck>

          {/* 두 그림을 잇는 문장 — 이 챕터의 핵심 */}
          {deathTop && aloneTop && (
            <motion.div
              className="max-w-[74ch] border-l-2 border-lamp/50 pl-6"
              initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <p className="text-lg leading-relaxed text-paper/85 md:text-xl">
                부산에서 혼자 사는 사람이 가장 많은 칸은{' '}
                <span className="num text-tide">
                  {aloneTop.band} {aloneTop.sex}성
                </span>
                입니다. 그런데 전국에서 혼자 죽는 사람이 가장 많은 칸은{' '}
                <span className="num text-lamp">
                  {deathTop.band} {deathTop.sex}성
                </span>
                입니다.{' '}
                {sexDiffers
                  ? '혼자 사는 사람과 혼자 죽는 사람은 같지 않습니다. 고립을 사람 수로만 세면 이 어긋남이 보이지 않습니다.'
                  : '두 그림에서 가장 두꺼운 칸이 같은 집단을 가리킵니다.'}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-paper/55">
                다만 왼쪽은 전국, 오른쪽은 부산입니다. 부산의 고독사 교차표가 없어 같은 지역끼리 비교하지
                못했습니다. 이 문장은 정황일 뿐 증명이 아닙니다.
              </p>
            </motion.div>
          )}

          {/* 없는 데이터를 없다고 그리는 자리 */}
          <div className="flex max-w-[74ch] flex-col gap-3 rounded-lg border border-dashed border-slate/60 p-6">
            <h3 className="font-serif text-xl text-paper/80">여기 있어야 할 세 번째 그림</h3>
            <p className="text-sm leading-relaxed text-paper/55">
              이 자리에는 <span className="text-paper/80">부산의 성별·연령대별 고독사 피라미드</span>가 와야
              합니다. 보건복지부 고독사 실태조사는 시·도별 발생 건수까지만 공개하고, 성별과 연령을 교차한 표는
              전국 단위로만 공개합니다. 전국 비율을 부산 건수에 곱해 추정치를 만들 수는 있었지만, 그렇게 만든
              숫자는 데이터가 아니라 가정입니다. 우리는 그 칸을 비워 두기로 했습니다.
            </p>
          </div>
        </>
      )}

      <VerdictCard result={verdict as never} />

      <UpNext />
    </section>
  );
}
