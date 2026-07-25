import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChartFrame } from '@/components/ChartFrame';
import { EmptyState } from '@/components/EmptyState';
import { VerdictCard } from '@/components/VerdictCard';
import { Slider } from '@/components/ui/slider';
import { IndexTrend, toIndex, type TrendSeries } from '@/charts/IndexTrend';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH1 } from '@/lib/hypothesis';
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

/**
 * Chapter 1 — H1: 부산은 정말 더 빠른가
 *
 * Chapter 0 의 격자가 흩어져 꺾은선으로 재조립된다.
 * 첫 연도 = 100 으로 지수화해 '수준'이 아니라 '속도'를 비교한다.
 */
export function Ch1Faster() {
  const { trend, deaths, loading } = useData();
  const reduced = useReducedMotion();
  const [metric, setMetric] = useState<MetricKey>('elderly');

  const trendRows = rowsOf(trend);
  const deathRows = rowsOf(deaths);

  // 지표에 따라 어떤 데이터로 선을 그릴지 고른다
  const series: TrendSeries[] = useMemo(() => {
    const build = (region: '부산' | '전국'): { year: number; value: number }[] =>
      metric === 'elderly'
        ? trendRows
            .filter((r) => r.region === region && r.elderly_alone !== null)
            .map((r) => ({ year: r.year, value: r.elderly_alone! }))
        : deathRows
            .filter((r) => r.region === region && r.per_100k !== null)
            .map((r) => ({ year: r.year, value: r.per_100k! }));

    return [
      { key: '부산', label: '부산', color: 'var(--lamp)', points: build('부산') },
      { key: '전국', label: '전국', color: 'var(--tide)', dashed: true, points: build('전국') },
    ];
  }, [metric, trendRows, deathRows]);

  const indexed = useMemo(
    () => ({
      부산: toIndex(series[0].points),
      전국: toIndex(series[1].points),
    }),
    [series]
  );

  const years = useMemo(
    () => [...new Set(indexed.부산.map((d) => d.year))].filter((y) => indexed.전국.some((d) => d.year === y)).sort(),
    [indexed]
  );

  const [yearIdx, setYearIdx] = useState<number | null>(null);
  const activeYear = years.length ? years[yearIdx ?? years.length - 1] : undefined;

  const verdict = useMemo(() => judgeH1(trendRows, deathRows), [trendRows, deathRows]);

  if (loading) return <section id="ch1" className="chapter min-h-screen" aria-busy="true" />;

  const busanAt = indexed.부산.find((d) => d.year === activeYear);
  const nationAt = indexed.전국.find((d) => d.year === activeYear);
  const baseYear = indexed.부산[0]?.year;

  // 기준연도 이후 '늘어난 폭'이 부산은 전국의 몇 배인가
  const gapRatio =
    busanAt && nationAt && nationAt.index > 100 ? (busanAt.index - 100) / (nationAt.index - 100) : null;

  return (
    <section id="ch1" className="chapter flex flex-col gap-14" aria-labelledby="ch1-heading">
      <header className="flex max-w-[70ch] flex-col gap-4">
        <span className="num text-xs tracking-[0.25em] text-lamp/70">CHAPTER 1 · 가설 H1</span>
        <h2 id="ch1-heading" className="font-serif text-headline text-paper">
          부산은 정말 더 빠른가
        </h2>
        <p className="leading-relaxed text-paper/60">
          부산은 전국에서 가장 먼저 초고령사회에 들어섰습니다. 그렇다면 고립이 늘어나는 <em className="not-italic text-paper/90">속도</em>도
          전국보다 빠를까요. 도시 크기가 다르면 사람 수를 그냥 비교할 수 없으니, 첫 연도를 100으로 놓고 얼마나 늘었는지만 봅니다.
        </p>
      </header>

      {/* 지표 전환 */}
      <div role="tablist" aria-label="비교할 지표" className="flex flex-wrap gap-2">
        {(Object.keys(METRICS) as MetricKey[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={metric === key}
            onClick={() => {
              setMetric(key);
              setYearIdx(null);
            }}
            className={cn(
              'rounded-full border px-4 py-2 text-sm transition-colors',
              metric === key
                ? 'border-lamp/60 bg-lamp/15 text-lamp'
                : 'border-slate/60 text-paper/55 hover:border-slate hover:text-paper/80'
            )}
          >
            {METRICS[key].label}
          </button>
        ))}
      </div>

      {years.length < 2 ? (
        <EmptyState
          title="데이터 준비 중"
          detail={`${METRICS[metric].label} 자료에서 부산과 전국을 함께 비교할 수 있는 연도가 충분하지 않습니다.`}
        />
      ) : (
        <ChartFrame
          title={`${baseYear}년 = 100 으로 본 ${METRICS[metric].label}`}
          subtitle="부산은 실선, 전국은 점선. 선이 위로 갈수록 빠르게 늘었다는 뜻입니다."
          summary={`${baseYear}년을 100으로 놓았을 때 ${activeYear}년 ${METRICS[metric].label} 지수는 부산 ${busanAt?.index.toFixed(0) ?? '없음'}, 전국 ${nationAt?.index.toFixed(0) ?? '없음'}입니다.`}
          sourceIds={[...METRICS[metric].sourceIds]}
          caveat={METRICS[metric].caveat}
        >
          <IndexTrend
            key={metric}
            series={series}
            activeYear={activeYear}
            morphSeriesKey="부산"
            ariaLabel={`${baseYear}년을 100으로 지수화한 부산과 전국의 ${METRICS[metric].label} 추세 꺾은선 그래프`}
          />

          {/* 연도 슬라이더 */}
          <div className="mt-6 flex flex-col gap-3">
            <label htmlFor="ch1-year" className="text-sm text-paper/50">
              연도를 움직여 두 선의 격차를 확인해 보세요
            </label>
            <div className="flex items-center gap-5">
              <Slider
                id="ch1-year"
                min={0}
                max={years.length - 1}
                step={1}
                value={[yearIdx ?? years.length - 1]}
                onValueChange={([v]) => setYearIdx(v)}
                thumbLabel="연도 선택"
                thumbValueText={`${activeYear}년`}
                className="max-w-xl"
              />
              <span className="num text-lg text-lamp">{activeYear}</span>
            </div>
          </div>

          {/* 실시간 격차 문장 */}
          <motion.p
            key={`${metric}-${activeYear}`}
            className="mt-6 max-w-[70ch] text-lg leading-relaxed text-paper/85 md:text-xl"
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {busanAt && nationAt ? (
              <>
                <span className="num text-lamp">{activeYear}년</span>, {baseYear}년을 100으로 보면 부산은{' '}
                <span className="num text-lamp">{busanAt.index.toFixed(0)}</span>, 전국은{' '}
                <span className="num text-tide">{nationAt.index.toFixed(0)}</span>입니다.
                {gapRatio !== null && (
                  <>
                    {' '}
                    늘어난 폭만 놓고 보면 부산이 전국의{' '}
                    <span className="num text-lamp">{gapRatio.toFixed(2)}배</span>입니다.
                  </>
                )}
              </>
            ) : (
              <span className="text-paper/50">{activeYear}년에는 비교할 값이 없습니다.</span>
            )}
          </motion.p>
        </ChartFrame>
      )}

      <VerdictCard result={verdict as never} />
    </section>
  );
}
