import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChartFrame } from '@/components/ChartFrame';
import { EmptyState } from '@/components/EmptyState';
import { VerdictCard } from '@/components/VerdictCard';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { Switch } from '@/components/ui/switch';
import { DistrictMap, MapLegend } from '@/charts/DistrictMap';
import { Scatter, type ScatterPoint } from '@/charts/Scatter';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH2 } from '@/lib/hypothesis';
import { fmtInt, fmtPct } from '@/lib/utils';
import type { DistrictRow } from '@/data/schema';

/**
 * Chapter 2 — H2: 어디가 가장 외로운가
 *
 * 격자가 지도 칸으로 변형된다. 고립이 심한 구일수록 창문처럼 밝게 켜진다.
 */
export function Ch2Where() {
  const { districts, geo, loading } = useData();
  const reduced = useReducedMotion();
  const [onlyOldDowntown, setOnlyOldDowntown] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const allRows = rowsOf(districts);
  const geoData = rowsOf(geo)[0] ?? null;

  // 가장 최근 연도만 지도에 그린다
  const year = allRows.length ? Math.max(...allRows.map((r) => r.year)) : null;
  const rows = useMemo(() => allRows.filter((r) => r.year === year), [allRows, year]);

  const verdict = useMemo(() => judgeH2(allRows), [allRows]);

  // 순위 — 카드에서 '16개 구 중 몇 번째'를 보여주는 데 쓴다
  const ranked = useMemo(
    () =>
      [...rows]
        .filter((r) => r.elderly_alone_rate !== null)
        .sort((a, b) => b.elderly_alone_rate! - a.elderly_alone_rate!),
    [rows]
  );
  const rankOf = (code: string) => {
    const i = ranked.findIndex((r) => r.sgg_code === code);
    return i === -1 ? null : i + 1;
  };

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

  const rates = rows.map((r) => r.elderly_alone_rate).filter((v): v is number => v !== null);

  if (loading) return <section id="ch2" className="chapter min-h-screen" aria-busy="true" />;

  return (
    <section id="ch2" className="chapter flex flex-col gap-14" aria-labelledby="ch2-heading">
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
          <ChartFrame
            title={`${year}년 부산 16개 구·군 독거노인 비율`}
            subtitle="65세 이상 인구 가운데 혼자 사는 비율. 밝을수록 높습니다."
            summary={`${year}년 독거노인 비율이 가장 높은 구는 ${ranked[0]?.sgg_name} ${fmtPct(ranked[0]?.elderly_alone_rate)}, 가장 낮은 구는 ${ranked[ranked.length - 1]?.sgg_name} ${fmtPct(ranked[ranked.length - 1]?.elderly_alone_rate)}입니다. 원도심 5개구 평균은 ${fmtPct(verdict.stats.oldDowntownMean)}, 나머지 11개구 평균은 ${fmtPct(verdict.stats.otherMean)}입니다.`}
            sourceIds={['kosis_elderly_alone', 'mois_age', 'kostat_sgg_boundary']}
            caveat="독거노인 수는 인구총조사, 65세 이상 인구는 주민등록 기준이라 분자와 분모의 조사 기준이 서로 다릅니다. 구 사이의 상대 비교에는 쓸 수 있지만 절대값은 조사에 따라 달라질 수 있습니다."
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <DistrictMap
                  geo={geoData}
                  rows={rows}
                  valueOf={(r) => r.elderly_alone_rate}
                  onlyOldDowntown={onlyOldDowntown}
                  selected={selected}
                  onSelect={setSelected}
                  ariaLabel={`${year}년 부산 16개 구·군 독거노인 비율 지도`}
                />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {rates.length > 0 && <MapLegend min={Math.min(...rates)} max={Math.max(...rates)} />}
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-paper/70">
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
                    원도심은 연구팀이 영도구·동구·중구·사상구·사하구로 정의했습니다. 행정적으로 정해진 구분이 아니라
                    이 연구의 기준입니다.
                  </p>
                )}
              </div>

              {/* 선택한 구의 카드 */}
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

                      <dl className="flex flex-col gap-3">
                        {[
                          {
                            k: '독거노인 비율',
                            v: fmtPct(active.elderly_alone_rate),
                            sub: rankOf(active.sgg_code) ? `16개 구 중 ${rankOf(active.sgg_code)}위` : null,
                          },
                          { k: '독거노인 수', v: `${fmtInt(active.elderly_alone)}가구`, sub: null },
                          { k: '고령화율', v: fmtPct(active.aging_rate), sub: null },
                          { k: '1인세대 비율', v: fmtPct(active.single_household_rate), sub: null },
                          {
                            k: '노후주택 비율',
                            v: fmtPct(active.old_housing_rate),
                            sub: '1989년 이전 준공',
                          },
                        ].map((row) => (
                          <div key={row.k} className="flex items-baseline justify-between gap-4 border-b border-slate/25 pb-2">
                            <dt className="text-sm text-paper/55">{row.k}</dt>
                            <dd className="flex items-baseline gap-2">
                              <span className="num text-lg text-paper">{row.v}</span>
                              {row.sub && <span className="text-xs text-paper/55">{row.sub}</span>}
                            </dd>
                          </div>
                        ))}
                      </dl>
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
            </div>
          </ChartFrame>

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
                ariaLabel="노후주택 비율과 독거노인 비율의 관계를 보여주는 산점도"
              />
            </ChartFrame>
          )}
        </>
      )}

      <VerdictCard result={verdict as never} />
    </section>
  );
}
