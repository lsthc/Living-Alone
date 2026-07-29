import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChartFrame } from '@/components/ChartFrame';
import { EmptyState } from '@/components/EmptyState';
import { UpNext } from '@/components/deck/UpNext';
import { VerdictCard } from '@/components/VerdictCard';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { Slider } from '@/components/ui/slider';
import { SwipeTabs } from '@/components/ui/SwipeTabs';
import { IndexTrend, toIndex, type TrendSeries } from '@/charts/IndexTrend';
import { rowsOf, useData } from '@/lib/DataProvider';
import { H1_CRITERION, judgeH1 } from '@/lib/hypothesis';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn } from '@/lib/utils';

/** 화면에서 고를 수 있는 두 지표. H1 은 이 두 축을 모두 본다. */
const METRICS = {
  elderly: {
    label: '독거노인 수',
    unit: '명',
    sourceIds: ['kosis_elderly_alone'],
    caveat:
      '인구총조사 기준이라 2011~2014년은 조사가 없어 값이 비어 있습니다. 선은 값이 있는 연도끼리 이어 그린 것입니다.',
  },
  deathRate: {
    label: '인구 10만 명당 고독사',
    unit: '명',
    sourceIds: ['mohw_lonely_2024survey', 'mohw_lonely_2025release', 'mois_age'],
    caveat:
      '고독사 통계는 2019년부터만 집계돼 장기 추세를 보기 어렵습니다. 10만 명당 발생률은 발표된 건수를 주민등록 인구로 나눠 이 연구가 직접 계산한 값입니다.',
  },
} as const;

type MetricKey = keyof typeof METRICS;

/** 화면에 놓이는 순서. 폰에서 미는 순서이기도 하다. */
const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

/**
 * Chapter 1 — H1: 부산은 정말 더 빠른가
 *
 * Chapter 0 의 격자가 흩어져 꺾은선으로 재조립된다.
 * 첫 연도 = 100 으로 지수화해 '수준'이 아니라 '속도'를 비교한다.
 */
export function Ch1Faster() {
  const { trend, deaths, loading } = useData();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  // 폰에서 옆으로 밀어도 지표가 바뀌므로, 고른 지표를 '몇 번째 장'으로 들고 있는다
  const [metricIdx, setMetricIdx] = useState(0);
  const metric = METRIC_KEYS[metricIdx];
  // 두 선을 하나씩 꺼 보면 각자 얼마나 움직였는지가 훨씬 잘 보인다
  const [shown, setShown] = useState<Record<'부산' | '전국', boolean>>({ 부산: true, 전국: true });

  const trendRows = rowsOf(trend);
  const deathRows = rowsOf(deaths);

  /**
   * 지표별 두 계열(부산·전국).
   *
   * 폰에서는 두 지표의 그래프를 나란히 깔아 놓고 밀어 넘기므로,
   * 지금 고른 것만이 아니라 지표마다 다 만들어 둔다.
   */
  const seriesByMetric = useMemo(() => {
    const build = (key: MetricKey, region: '부산' | '전국'): { year: number; value: number }[] =>
      key === 'elderly'
        ? trendRows
            .filter((r) => r.region === region && r.elderly_alone !== null)
            .map((r) => ({ year: r.year, value: r.elderly_alone! }))
        : deathRows
            .filter((r) => r.region === region && r.per_100k !== null)
            .map((r) => ({ year: r.year, value: r.per_100k! }));

    return Object.fromEntries(
      METRIC_KEYS.map((key) => [
        key,
        [
          { key: '부산', label: '부산', color: 'var(--primary)', points: build(key, '부산') },
          { key: '전국', label: '전국', color: 'var(--muted)', dashed: true, points: build(key, '전국') },
        ] as TrendSeries[],
      ])
    ) as Record<MetricKey, TrendSeries[]>;
  }, [trendRows, deathRows]);

  const indexedByMetric = useMemo(
    () =>
      Object.fromEntries(
        METRIC_KEYS.map((key) => [
          key,
          { 부산: toIndex(seriesByMetric[key][0].points), 전국: toIndex(seriesByMetric[key][1].points) },
        ])
      ) as Record<MetricKey, { 부산: ReturnType<typeof toIndex>; 전국: ReturnType<typeof toIndex> }>,
    [seriesByMetric]
  );

  const indexed = indexedByMetric[metric];

  // 껐다 켜는 것은 '그리기'만이다. 아래 격차 문장과 판정은 언제나 두 계열을 다 본다.
  const shownSeries = (key: MetricKey) => seriesByMetric[key].filter((s) => shown[s.key as '부산' | '전국']);

  const years = useMemo(
    () => [...new Set(indexed.부산.map((d) => d.year))].filter((y) => indexed.전국.some((d) => d.year === y)).sort(),
    [indexed]
  );

  const [yearIdx, setYearIdx] = useState<number | null>(null);
  const activeYear = years.length ? years[yearIdx ?? years.length - 1] : undefined;

  /**
   * 연도 자동 재생.
   * 발표할 때 슬라이더를 손으로 끄는 것보다, 재생을 눌러 두고 말로 설명하는 편이 낫다.
   * 끝에 닿으면 스스로 멈춘다 — 반복 재생은 눈이 따라가다 지친다.
   */
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || years.length < 2) return;
    const id = window.setInterval(() => {
      setYearIdx((prev) => {
        const cur = prev ?? years.length - 1;
        if (cur >= years.length - 1) {
          setPlaying(false);
          return cur;
        }
        return cur + 1;
      });
    }, 650);
    return () => window.clearInterval(id);
  }, [playing, years.length]);

  const play = () => {
    // 끝에서 다시 누르면 처음부터
    if ((yearIdx ?? years.length - 1) >= years.length - 1) setYearIdx(0);
    setPlaying(true);
  };

  const verdict = useMemo(() => judgeH1(trendRows, deathRows), [trendRows, deathRows]);

  if (loading) return <section id="ch1" className="chapter min-h-full" aria-busy="true" />;

  const busanAt = indexed.부산.find((d) => d.year === activeYear);
  const nationAt = indexed.전국.find((d) => d.year === activeYear);
  const baseYear = indexed.부산[0]?.year;

  // 기준연도 이후 '늘어난 폭'이 부산은 전국의 몇 배인가
  const gapRatio =
    busanAt && nationAt && nationAt.index > 100 ? (busanAt.index - 100) / (nationAt.index - 100) : null;

  return (
    <section id="ch1" className="chapter flex flex-col gap-10 md:gap-14" aria-labelledby="ch1-heading">
      <header className="flex max-w-[70ch] flex-col gap-4">
        <span className="num text-xs tracking-[0.25em] text-primary/70">CHAPTER 1 · 가설 H1</span>
        <h2 id="ch1-heading" className="text-headline text-foreground">
          <BlurText text="부산은 정말 더 빠른가" />
        </h2>
        <ScrollRevealText className="leading-relaxed text-muted">
          부산은 전국에서 가장 먼저 초고령사회에 들어섰습니다. 그렇다면 고립이 늘어나는 <em className="not-italic text-body">속도</em>도
          전국보다 빠를까요. 도시 크기가 다르면 사람 수를 그냥 비교할 수 없으니, 첫 연도를 100으로 놓고 얼마나 늘었는지만 봅니다.
        </ScrollRevealText>
      </header>

      {/* 선 켜고 끄기 */}
      <div className="flex items-center gap-2">
        {(['부산', '전국'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
            aria-pressed={shown[key]}
            className={cn(
              'flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-xs transition-colors',
              shown[key] ? 'border-border text-body' : 'border-border/40 text-muted'
            )}
          >
            <span
              className="block h-2.5 w-2.5 rounded-[2px]"
              style={{
                backgroundColor: shown[key] ? (key === '부산' ? 'var(--primary)' : 'var(--muted)') : 'transparent',
                border: shown[key] ? 'none' : '1px solid currentColor',
              }}
              aria-hidden
            />
            {key} 선 {shown[key] ? '켬' : '끔'}
          </button>
        ))}
      </div>

      {years.length < 2 ? (
        <EmptyState
          title="데이터 준비 중"
          detail={`${METRICS[metric].label} 자료에서 부산과 전국을 함께 비교할 수 있는 연도가 충분하지 않습니다.`}
        />
      ) : (
        <>
          {/* 지표 전환 — 버튼으로도, 폰에서는 옆으로 밀어도 바뀐다 */}
          <SwipeTabs
            ariaLabel="비교할 지표"
            labels={METRIC_KEYS.map((k) => METRICS[k].label)}
            index={metricIdx}
            onIndexChange={(i) => {
              setMetricIdx(i);
              setYearIdx(null);
              setPlaying(false);
            }}
          >
            {METRIC_KEYS.map((key, i) => {
              const base = indexedByMetric[key].부산[0]?.year;
              const lines = shownSeries(key);
              return (
                <ChartFrame
                  key={key}
                  title={`${base}년 = 100 으로 본 ${METRICS[key].label}`}
                  subtitle="부산은 실선, 전국은 점선. 선이 위로 갈수록 빠르게 늘었다는 뜻입니다."
                  summary={`${base}년을 100으로 놓았을 때 ${activeYear}년 ${METRICS[key].label} 지수는 부산 ${busanAt?.index.toFixed(0) ?? '없음'}, 전국 ${nationAt?.index.toFixed(0) ?? '없음'}입니다.`}
                  sourceIds={[...METRICS[key].sourceIds]}
                  caveat={METRICS[key].caveat}
                >
                  {lines.length === 0 ? (
                    <p className="flex min-h-[200px] items-center justify-center rounded-btn-lg border border-dashed border-border text-sm text-muted">
                      두 선을 모두 껐습니다. 위에서 하나 이상 켜 주세요.
                    </p>
                  ) : (
                    <IndexTrend
                      key={`${key}-${lines.map((s) => s.key).join('')}`}
                      series={lines}
                      // 지금 보고 있는 장에만 연도 안내선을 세운다.
                      // 옆 장은 연도 범위가 달라 같은 해를 그으면 그림 밖으로 나간다.
                      activeYear={i === metricIdx ? activeYear : undefined}
                      morphSeriesKey="부산"
                      // 폰에서는 두 지표의 그래프가 동시에 살아 있다.
                      // 격자→선 모션의 사각형까지 두 벌이면 저사양 기기에서 첫 프레임이 밀린다.
                      squareCount={mobile ? 40 : 96}
                      mobile={mobile}
                      ariaLabel={`${base}년을 100으로 지수화한 부산과 전국의 ${METRICS[key].label} 추세 꺾은선 그래프`}
                    />
                  )}
                </ChartFrame>
              );
            })}
          </SwipeTabs>

          {/* 연도 슬라이더와 자동 재생 */}
          <div className="flex flex-col gap-3">
            <label htmlFor="ch1-year" className="text-sm text-muted">
              연도를 움직여 두 선의 격차를 확인해 보세요
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => (playing ? setPlaying(false) : play())}
                aria-label={playing ? '연도 자동 재생 멈춤' : '연도 자동 재생'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/15"
              >
                {playing ? (
                  <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden>
                    <rect x="1" y="1" width="3.5" height="11" rx="1" />
                    <rect x="7.5" y="1" width="3.5" height="11" rx="1" />
                  </svg>
                ) : (
                  <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden>
                    <path d="M2 1.5 L11 6.5 L2 11.5 Z" />
                  </svg>
                )}
              </button>
              <Slider
                id="ch1-year"
                min={0}
                max={years.length - 1}
                step={1}
                value={[yearIdx ?? years.length - 1]}
                onValueChange={([v]) => {
                  setPlaying(false);
                  setYearIdx(v);
                }}
                thumbLabel="연도 선택"
                thumbValueText={`${activeYear}년`}
                className="max-w-xl"
              />
              <span className="num text-lg text-primary">{activeYear}</span>
            </div>
          </div>

          {/* 실시간 격차 문장 */}
          <motion.p
            key={`${metric}-${activeYear}`}
            className="max-w-[70ch] text-lg leading-relaxed text-body md:text-xl"
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {busanAt && nationAt ? (
              <>
                <span className="num text-primary">{activeYear}년</span>, {baseYear}년을 100으로 보면 부산은{' '}
                <span className="num text-primary">{busanAt.index.toFixed(0)}</span>, 전국은{' '}
                <span className="num text-muted">{nationAt.index.toFixed(0)}</span>입니다.
                {gapRatio !== null && (
                  <>
                    {' '}
                    늘어난 폭만 놓고 보면 부산이 전국의{' '}
                    <span className="num text-primary">{gapRatio.toFixed(2)}배</span>입니다.
                  </>
                )}
              </>
            ) : (
              <span className="text-muted">{activeYear}년에는 비교할 값이 없습니다.</span>
            )}
          </motion.p>
        </>
      )}

      {/* 그림과 판정의 기준이 다르다는 것을 먼저 밝힌다 */}
      <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
        위 그래프는 첫 연도를 100으로 놓은 <em className="not-italic text-body">지수 추세</em>입니다. 반면 아래 판정은
        2일차 연구계획서에 <em className="not-italic text-body">분석하기 전에 미리 등록해 둔 기준</em>
        — {H1_CRITERION.baseYear}년부터의 연평균 증가율을 비교해 부산이 전국보다 {H1_CRITERION.gapThresholdPp}%p 이상 높으면
        충족 — 으로 계산한 것입니다. 그래서 그림에서 보이는 인상과 판정이 어긋날 수 있습니다. 결과를 보고 기준을 고치지 않으려고
        기준을 코드에 상수로 박아 뒀습니다.
      </p>

      <VerdictCard result={verdict as never} />

      <UpNext />
    </section>
  );
}
