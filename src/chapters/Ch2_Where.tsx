import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChartFrame } from '@/components/ChartFrame';
import { EmptyState } from '@/components/EmptyState';
import { UpNext } from '@/components/deck/UpNext';
import { VerdictCard } from '@/components/VerdictCard';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { Switch } from '@/components/ui/switch';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SwipeTabs } from '@/components/ui/SwipeTabs';
import { DistrictMap, MapLegend, rampColor } from '@/charts/DistrictMap';
import { Scatter, type ScatterPoint } from '@/charts/Scatter';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH2 } from '@/lib/hypothesis';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn, fmtInt, fmtPct } from '@/lib/utils';
import type { DistrictRow } from '@/data/schema';

/**
 * 지도에 칠할 수 있는 지표들.
 *
 * H2 가 보는 것은 독거노인 비율 하나지만, 나머지 셋을 나란히 켜 볼 수 있게 뒀다.
 * "밝은 구가 원래 다 밝은 것 아닌가요"라는 질문에 지도를 바꿔 끼우며 답할 수 있어야 한다.
 */
const MAP_METRICS = {
  elderly_alone_rate: {
    label: '독거노인 비율',
    of: (r: DistrictRow) => r.elderly_alone_rate,
    sourceIds: ['kosis_elderly_alone', 'mois_age', 'kostat_sgg_boundary'],
    caveat:
      '독거노인 수는 인구총조사, 65세 이상 인구는 주민등록 기준이라 분자와 분모의 조사 기준이 서로 다릅니다. 구 사이의 상대 비교에는 쓸 수 있지만 절대값은 조사에 따라 달라질 수 있습니다.',
  },
  aging_rate: {
    label: '고령화율',
    of: (r: DistrictRow) => r.aging_rate,
    sourceIds: ['mois_age', 'kostat_sgg_boundary'],
    caveat: '전체 인구 가운데 65세 이상이 차지하는 비율입니다. 주민등록 기준입니다.',
  },
  single_household_rate: {
    label: '1인세대 비율',
    of: (r: DistrictRow) => r.single_household_rate,
    sourceIds: ['mois_single_age', 'kostat_sgg_boundary'],
    caveat:
      '나이와 무관한 1인세대 비율입니다. 대학가나 원룸이 많은 동네도 높게 나오므로 독거노인 비율과 같은 뜻이 아닙니다.',
  },
  old_housing_rate: {
    label: '노후주택 비율',
    of: (r: DistrictRow) => r.old_housing_rate,
    sourceIds: ['kosis_old_housing', 'kostat_sgg_boundary'],
    caveat:
      "공표 구간이 '1979년 이전 / 1980~1989 / 1990~1999'뿐이라 '30년 이상'을 정확히 계산할 수 없습니다. 이 값은 1989년 이전 준공(2024년 기준 35년 이상) 비율입니다.",
  },
} as const;

type MapMetricKey = keyof typeof MAP_METRICS;

/** 화면에 놓이는 순서. 폰에서 미는 순서이기도 하다. */
const MAP_METRIC_KEYS = Object.keys(MAP_METRICS) as MapMetricKey[];

/**
 * 고른 구·군의 수치 묶음.
 * 넓은 화면에서는 지도 옆 칸에, 폰에서는 아래에서 올라오는 시트 안에 같은 내용이 들어간다.
 */
function DistrictDetail({
  row,
  activeMetric,
  rank,
}: {
  row: DistrictRow;
  activeMetric: MapMetricKey;
  rank: number | null;
}) {
  const items = [
    { key: 'elderly_alone_rate', k: '독거노인 비율', v: fmtPct(row.elderly_alone_rate), sub: null },
    { key: null, k: '독거노인 수', v: `${fmtInt(row.elderly_alone)}가구`, sub: null },
    { key: 'aging_rate', k: '고령화율', v: fmtPct(row.aging_rate), sub: null },
    { key: 'single_household_rate', k: '1인세대 비율', v: fmtPct(row.single_household_rate), sub: null },
    { key: 'old_housing_rate', k: '노후주택 비율', v: fmtPct(row.old_housing_rate), sub: '1989년 이전 준공' },
  ];

  return (
    <dl className="flex flex-col gap-3">
      {items.map((item) => {
        // 지금 지도에 칠한 지표에만 순위를 붙인다 (다른 지표의 순위는 계산하지 않았다)
        const on = item.key === activeMetric;
        return (
          <div
            key={item.k}
            className={cn('flex items-baseline justify-between gap-4 border-b pb-2', on ? 'border-lamp/40' : 'border-slate/25')}
          >
            <dt className={cn('text-sm', on ? 'text-lamp/80' : 'text-paper/55')}>{item.k}</dt>
            <dd className="flex items-baseline gap-2">
              <span className={cn('num text-lg', on ? 'text-lamp' : 'text-paper')}>{item.v}</span>
              {on && rank && <span className="text-xs text-paper/55">16개 구 중 {rank}위</span>}
              {!(on && rank) && item.sub && <span className="text-xs text-paper/55">{item.sub}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Chapter 2 — H2: 어디가 가장 외로운가
 *
 * 격자가 지도 칸으로 변형된다. 고립이 심한 구일수록 창문처럼 밝게 켜진다.
 */
export function Ch2Where() {
  const { districts, geo, loading } = useData();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const [onlyOldDowntown, setOnlyOldDowntown] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // 폰에서 옆으로 밀어도 지표가 바뀌므로, 고른 지표를 '몇 번째 장'으로 들고 있는다
  const [metricIdx, setMetricIdx] = useState(0);
  const mapMetric = MAP_METRIC_KEYS[metricIdx];
  const metric = MAP_METRICS[mapMetric];

  const allRows = rowsOf(districts);
  const geoData = rowsOf(geo)[0] ?? null;

  // 가장 최근 연도만 지도에 그린다
  const year = allRows.length ? Math.max(...allRows.map((r) => r.year)) : null;
  const rows = useMemo(() => allRows.filter((r) => r.year === year), [allRows, year]);

  const verdict = useMemo(() => judgeH2(allRows), [allRows]);

  // 지금 고른 지표 기준 순위 — 지도 옆 막대 목록과 카드의 '16개 구 중 몇 번째'에 쓴다
  const ranked = useMemo(
    () =>
      [...rows]
        .filter((r) => metric.of(r) !== null)
        .sort((a, b) => metric.of(b)! - metric.of(a)!),
    [rows, metric]
  );
  const rankOf = (code: string) => {
    const i = ranked.findIndex((r) => r.sgg_code === code);
    return i === -1 ? null : i + 1;
  };
  const rankMax = ranked.length ? metric.of(ranked[0])! : 0;
  const rankMin = ranked.length ? metric.of(ranked[ranked.length - 1])! : 0;

  const active: DistrictRow | null = selected ? (rows.find((r) => r.sgg_code === selected) ?? null) : null;

  const scatterPoints: ScatterPoint[] = useMemo(
    () =>
      rows
        .filter((r) => r.old_housing_rate !== null && r.elderly_alone_rate !== null)
        .map((r) => ({
          key: r.sgg_code,
          label: r.sgg_name,
          x: r.old_housing_rate!,
          y: r.elderly_alone_rate!,
          size: r.population,
          highlight: r.is_old_downtown,
        })),
    [rows]
  );

  if (loading) return <section id="ch2" className="chapter min-h-full" aria-busy="true" />;

  return (
    <section id="ch2" className="chapter flex flex-col gap-10 md:gap-14" aria-labelledby="ch2-heading">
      <header className="flex max-w-[70ch] flex-col gap-4">
        <span className="num text-xs tracking-[0.25em] text-lamp/70">CHAPTER 2 · 가설 H2</span>
        <h2 id="ch2-heading" className="font-serif text-headline text-paper">
          <BlurText text="어디가 가장 외로운가" />
        </h2>
        <ScrollRevealText className="leading-relaxed text-paper/60">
          부산은 하나가 아닙니다. 산업이 떠난 원도심과 새로 지은 신도시는 같은 도시 안에서 다른 시간을 살고 있습니다.
          오래된 동네일수록 혼자 사는 노인이 많은지, 16개 구·군을 하나씩 켜서 확인합니다.
        </ScrollRevealText>
      </header>

      {!geoData || rows.length === 0 ? (
        <EmptyState
          title="데이터 준비 중"
          detail="구·군별 지표 또는 경계 파일을 읽지 못했습니다. public/data/03_busan_districts.csv 와 busan_sgg.geojson 을 확인해 주세요."
        />
      ) : (
        <>
          {/* 지도에 칠할 지표 — 버튼으로도, 폰에서는 옆으로 밀어도 바뀐다 */}
          <SwipeTabs
            ariaLabel="지도에 칠할 지표"
            labels={MAP_METRIC_KEYS.map((k) => MAP_METRICS[k].label)}
            index={metricIdx}
            onIndexChange={setMetricIdx}
          >
            {MAP_METRIC_KEYS.map((key) => {
              const m = MAP_METRICS[key];
              const vals = rows.map(m.of).filter((v): v is number => v !== null);
              const sorted = [...rows].filter((r) => m.of(r) !== null).sort((a, b) => m.of(b)! - m.of(a)!);
              return (
                <ChartFrame
                  key={key}
                  title={`${year}년 부산 16개 구·군 ${m.label}`}
                  subtitle={
                    mobile
                      ? '밝을수록 높습니다. 구·군을 누르면 아래에서 자세한 수치가 올라옵니다.'
                      : '밝을수록 높습니다. 지도나 아래 순위 목록에서 구·군을 고르면 자세한 수치가 나옵니다.'
                  }
                  summary={`${year}년 ${m.label}이 가장 높은 구는 ${sorted[0]?.sgg_name} ${fmtPct(sorted[0] ? m.of(sorted[0]) : null)}, 가장 낮은 구는 ${sorted[sorted.length - 1]?.sgg_name} ${fmtPct(sorted.length ? m.of(sorted[sorted.length - 1]) : null)}입니다. 독거노인 비율 기준 원도심 5개구 평균은 ${fmtPct(verdict.stats.oldDowntownMean)}, 나머지 11개구 평균은 ${fmtPct(verdict.stats.otherMean)}입니다.`}
                  sourceIds={[...m.sourceIds]}
                  caveat={m.caveat}
                >
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4">
                      <DistrictMap
                        key={key}
                        geo={geoData}
                        rows={rows}
                        valueOf={m.of}
                        onlyOldDowntown={onlyOldDowntown}
                        selected={selected}
                        onSelect={setSelected}
                        interactionMode={mobile ? 'tap' : 'hover'}
                        ariaLabel={`${year}년 부산 16개 구·군 ${m.label} 지도`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        {vals.length > 0 && <MapLegend min={Math.min(...vals)} max={Math.max(...vals)} />}
                        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-paper/70">
                          <Switch
                            checked={onlyOldDowntown}
                            onCheckedChange={setOnlyOldDowntown}
                            aria-label="원도심 5개구만 보기"
                          />
                          원도심 5개구만 보기
                        </label>
                      </div>
                      {onlyOldDowntown && (
                        <p className="text-sm leading-relaxed text-paper/60">
                          원도심은 연구팀이 영도구·동구·중구·사상구·사하구로 정의했습니다. 행정적으로 정해진
                          구분이 아니라 이 연구의 기준입니다.
                        </p>
                      )}
                    </div>

                    {/* 선택한 구의 카드 — 폰에서는 이 자리 대신 아래에서 시트가 올라온다 */}
                    {!mobile && (
                      <div className="min-h-[300px]">
                        <AnimatePresence mode="wait">
                          {active ? (
                            <motion.div
                              key={active.sgg_code}
                              className="flex flex-col gap-5 rounded-lg border border-slate/50 bg-ink/60 p-6"
                              initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -8 }}
                              transition={{ duration: 0.25 }}
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <h4 className="font-serif text-2xl text-paper">{active.sgg_name}</h4>
                                {active.is_old_downtown && (
                                  <span className="rounded-full border border-lamp/40 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp">
                                    원도심
                                  </span>
                                )}
                              </div>
                              <DistrictDetail row={active} activeMetric={key} rank={rankOf(active.sgg_code)} />
                            </motion.div>
                          ) : (
                            <motion.p
                              key="hint"
                              className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate/50 p-6 text-center text-sm text-paper/55"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              지도에서 구·군을 가리키거나 탭하면
                              <br />
                              자세한 수치가 나타납니다
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </ChartFrame>
              );
            })}
          </SwipeTabs>

          {/*
           * 순위 막대 — 지도는 '어디'를 보여주지만 '몇 번째'는 못 보여준다.
           * 색이 비슷한 두 구 중 어느 쪽이 높은지는 지도만으로 절대 알 수 없다.
           * 누르면 지도의 선택과 그대로 이어지고, 폰에서는 시트가 올라온다.
           */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm text-paper/55">
              {metric.label} 순위{' '}
              <span className="text-paper/35">· {mobile ? '누르면 아래에서 자세히 올라옵니다' : '누르면 지도와 함께 표시됩니다'}</span>
            </h4>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {ranked.map((r, i) => {
                const v = metric.of(r)!;
                const t = rankMax === rankMin ? 1 : (v - rankMin) / (rankMax - rankMin);
                const on = selected === r.sgg_code;
                const dimmed = onlyOldDowntown && !r.is_old_downtown;
                return (
                  <li key={r.sgg_code}>
                    <button
                      type="button"
                      // 폰에서는 한 번의 탭에 mouseenter 가 먼저 들어와 방금 연 시트를 닫아 버린다.
                      // 그래서 손가락 기기에서는 누름만 받는다.
                      onMouseEnter={mobile ? undefined : () => setSelected(r.sgg_code)}
                      onFocus={mobile ? undefined : () => setSelected(r.sgg_code)}
                      onClick={() => setSelected(!mobile && on ? null : r.sgg_code)}
                      aria-pressed={on}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border px-2.5 text-left transition-colors',
                        // 폰에서는 손가락이 닿는 높이(44px)를 지킨다
                        mobile ? 'min-h-[44px] py-2' : 'py-1.5',
                        on ? 'border-lamp/60 bg-lamp/10' : 'border-transparent hover:border-slate/60',
                        dimmed && 'opacity-35'
                      )}
                    >
                      <span className="num w-5 shrink-0 text-right text-xs text-paper/40">{i + 1}</span>
                      <span
                        className={cn(
                          'w-16 shrink-0 truncate text-sm',
                          r.is_old_downtown ? 'text-paper' : 'text-paper/70'
                        )}
                      >
                        {r.sgg_name}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate/25">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ backgroundColor: rampColor(t) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(t * 100, 4)}%` }}
                          transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.02 }}
                        />
                      </span>
                      <span className="num w-14 shrink-0 text-right text-sm text-paper/80">{fmtPct(v)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {scatterPoints.length >= 3 && (
            <ChartFrame
              title="오래된 집이 많은 동네일수록 혼자 사는 노인이 많은가"
              subtitle="점 하나가 구·군 하나. 점 크기는 인구, 앰버는 원도심 5개구입니다."
              summary={`노후주택 비율과 독거노인 비율의 상관계수는 ${verdict.stats.correlation ?? '계산 불가'}입니다. 상관이 있다는 것이 원인이라는 뜻은 아닙니다.`}
              sourceIds={['kosis_old_housing', 'kosis_elderly_alone', 'mois_age']}
              caveat="노후주택 비율은 공표 구간이 '1979년 이전 / 1980~1989 / 1990~1999'뿐이라 '30년 이상'을 정확히 계산할 수 없습니다. 이 값은 1989년 이전 준공 비율(2024년 기준 35년 이상)입니다. 또한 상관관계는 인과관계가 아닙니다."
            >
              <Scatter
                points={scatterPoints}
                xLabel="노후주택 비율 (%, 1989년 이전 준공)"
                yLabel="독거노인 비율 (%)"
                selected={selected}
                onSelect={setSelected}
                mobile={mobile}
                ariaLabel="노후주택 비율과 독거노인 비율의 관계를 보여주는 산점도"
              />
              {mobile && (
                <p className="mt-2 text-xs text-paper/55">
                  좁은 화면에서는 원도심 5개구의 이름만 보입니다. 다른 점은 탭하면 이름이 나타납니다.
                </p>
              )}
            </ChartFrame>
          )}

          {/* 폰 — 구·군을 누르면 자세한 수치가 아래에서 올라온다 */}
          <BottomSheet
            open={mobile && !!active}
            onClose={() => setSelected(null)}
            tone="dark"
            title={active?.sgg_name ?? ''}
            subtitle={`${year}년 · ${metric.label} 기준 16개 구·군 중 ${active ? (rankOf(active.sgg_code) ?? '—') : '—'}위`}
          >
            {active && (
              <div className="flex flex-col gap-5 pb-2">
                {active.is_old_downtown && (
                  <span className="self-start rounded-full border border-lamp/40 bg-lamp/10 px-2.5 py-0.5 text-xs text-lamp">
                    원도심
                  </span>
                )}
                <DistrictDetail row={active} activeMetric={mapMetric} rank={rankOf(active.sgg_code)} />
                <p className="text-xs leading-relaxed text-paper/55">{metric.caveat}</p>
              </div>
            )}
          </BottomSheet>
        </>
      )}

      <VerdictCard result={verdict as never} />

      <UpNext />
    </section>
  );
}
