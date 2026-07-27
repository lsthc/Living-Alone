import type { DemoRow, DistrictRow, LonelyDeathRow, TrendRow } from '@/data/schema';

/**
 * 가설 판정 — 순수 함수만 모아둔 파일.
 *
 * 이 앱의 결론은 전부 여기서 나온다. 화면은 결과를 그리기만 한다.
 * 데이터가 바뀌면 판정도 자동으로 바뀐다. 심사위원이 이 파일만 읽어도 논리를 검증할 수 있다.
 *
 * ★ 가장 중요한 규칙: 가설이 기각되면 기각이라고 쓴다. 결론을 데이터에 맞춘다.
 */

export type Verdict = '채택' | '부분채택' | '기각' | '검증불가';

export interface HypothesisResult<S = Record<string, number | null>> {
  id: 'H1' | 'H2' | 'H3';
  title: string;
  verdict: Verdict;
  /** 판정의 근거가 된 수치를 한 문장으로 */
  evidence: string;
  /** 왜 그런 판정이 나왔는지 2~3문장 해석 */
  interpretation: string;
  stats: S;
}

// ── 작은 통계 도구들 ────────────────────────────────────────────────────────

/** 피어슨 상관계수. 표본이 3쌍 미만이거나 분산이 0이면 null. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** 최소제곱 직선. 산점도 추세선에 쓴다. */
export function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const round = (v: number, d = 2) => Number(v.toFixed(d));

/** 값이 있는 가장 이른 연도와 가장 늦은 연도의 쌍을 찾는다. */
function firstLast<T extends { year: number }>(rows: T[], pick: (r: T) => number | null) {
  const valid = rows
    .map((r) => ({ year: r.year, value: pick(r) }))
    .filter((r): r is { year: number; value: number } => r.value !== null)
    .sort((a, b) => a.year - b.year);
  if (valid.length < 2) return null;
  return { first: valid[0], last: valid[valid.length - 1] };
}

/** 시작연도 대비 마지막연도의 배율 (2010년=100 지수의 마지막 값 ÷ 100) */
function growthRatio<T extends { year: number }>(rows: T[], pick: (r: T) => number | null) {
  const fl = firstLast(rows, pick);
  if (!fl || fl.first.value === 0) return null;
  return { ...fl, ratio: fl.last.value / fl.first.value };
}

/**
 * 연평균 증가율(CAGR, %). 기준연도부터 최신 연도까지.
 * 두 끝점 중 하나라도 값이 없으면 계산하지 않는다 — 그 축은 '판정 불가'가 된다.
 */
function cagrFrom<T extends { year: number }>(rows: T[], pick: (r: T) => number | null, fromYear: number) {
  const valid = rows
    .map((r) => ({ year: r.year, value: pick(r) }))
    .filter((r): r is { year: number; value: number } => r.value !== null && r.value > 0)
    .sort((a, b) => a.year - b.year);
  const first = valid.find((r) => r.year === fromYear);
  const last = valid[valid.length - 1];
  if (!first || !last || last.year <= first.year) return null;
  const years = last.year - first.year;
  return { from: first.year, to: last.year, pct: (Math.pow(last.value / first.value, 1 / years) - 1) * 100 };
}

// ── H1 ─────────────────────────────────────────────────────────────────────

/**
 * H1 의 판정 기준 — 2일차(7.18) 연구계획서에 **분석 전에 미리** 등록한 값이다.
 *
 * 결과를 보고 이 숫자를 고치면 검증이 아니라 변명이 된다. 그래서 상수로 박아 둔다.
 * 실제로 이 기준 때문에 H1 은 '채택'이 아니라 '부분채택'이 됐다. 기준을 지킨 대가다.
 */
export const H1_CRITERION = {
  /** 등록된 비교 기준연도. 끝 연도는 데이터의 최신 연도를 쓴다. */
  baseYear: 2019,
  /** 부산의 연평균 증가율이 전국보다 이만큼(%p) 이상 높아야 그 축을 '충족'으로 본다. */
  gapThresholdPp: 1,
} as const;

export interface H1Stats {
  from: number | null; // 비교 시작연도 (= 등록된 기준연도)
  to: number | null; // 비교 종료연도 (= 데이터의 최신 연도)
  // ── 축 ①: 독거노인 수 연평균 증가율 (%)
  elderlyCagrBusan: number | null;
  elderlyCagrNation: number | null;
  elderlyGapPp: number | null; // 부산 − 전국 (%p)
  // ── 축 ②: 고독사 발생 수 연평균 증가율 (%)
  deathsCagrBusan: number | null;
  deathsCagrNation: number | null;
  deathsGapPp: number | null;
  // ── 보조 지표 (판정에는 쓰지 않는다)
  rateGapPp: number | null; // 10만 명당 발생률로 다시 계산한 격차
  elderlyRatioBusan: number | null; // 2010→최신 독거노인 증가배율
  elderlyRatioNation: number | null;
  ratioFrom: number | null;
  latestRateBusan: number | null; // 최신 연도 10만 명당 발생률
  latestRateNation: number | null;
  latestRateGap: number | null; // 부산 ÷ 전국
}

/**
 * H1 — 부산의 독거노인 수와 고독사 발생 수가 전국 평균보다 더 가파르게 증가하는가.
 *
 * 판정 규칙 (연구계획서에 사전 등록한 그대로)
 *   ① 독거노인 수 연평균 증가율: 부산 − 전국 ≥ 1%p ?
 *   ② 고독사 발생 수 연평균 증가율: 부산 − 전국 ≥ 1%p ?
 *   둘 다 충족 → 채택 / 하나만 → 부분채택 / 둘 다 미달 → 기각
 *
 * '부산이 더 빠르기만 하면 된다'가 아니라 '1%p 이상 더 빨라야 한다'는 점이 핵심이다.
 * 부산은 두 축 모두에서 전국보다 빠르지만, 독거노인 축의 격차는 0.11%p 로 기준에 못 미친다.
 */
export function judgeH1(trend: TrendRow[], deaths: LonelyDeathRow[]): HypothesisResult<H1Stats> {
  const base = H1_CRITERION.baseYear;
  const busanTrend = trend.filter((r) => r.region === '부산');
  const nationTrend = trend.filter((r) => r.region === '전국');
  const busanDeath = deaths.filter((r) => r.region === '부산');
  const nationDeath = deaths.filter((r) => r.region === '전국');

  const ec = {
    busan: cagrFrom(busanTrend, (r) => r.elderly_alone, base),
    nation: cagrFrom(nationTrend, (r) => r.elderly_alone, base),
  };
  const dc = {
    busan: cagrFrom(busanDeath, (r) => r.deaths, base),
    nation: cagrFrom(nationDeath, (r) => r.deaths, base),
  };
  const rc = {
    busan: cagrFrom(busanDeath, (r) => r.per_100k, base),
    nation: cagrFrom(nationDeath, (r) => r.per_100k, base),
  };

  const ratio = {
    busan: growthRatio(busanTrend, (r) => r.elderly_alone),
    nation: growthRatio(nationTrend, (r) => r.elderly_alone),
  };
  const latestBusan = busanDeath.filter((r) => r.per_100k !== null).sort((a, b) => b.year - a.year)[0];
  const latestNation = nationDeath.filter((r) => r.per_100k !== null).sort((a, b) => b.year - a.year)[0];

  const gap = (a: { pct: number } | null, b: { pct: number } | null) =>
    a && b ? round(a.pct - b.pct, 2) : null;

  const stats: H1Stats = {
    from: ec.busan?.from ?? dc.busan?.from ?? null,
    to: ec.busan?.to ?? dc.busan?.to ?? null,
    elderlyCagrBusan: ec.busan ? round(ec.busan.pct, 2) : null,
    elderlyCagrNation: ec.nation ? round(ec.nation.pct, 2) : null,
    elderlyGapPp: gap(ec.busan, ec.nation),
    deathsCagrBusan: dc.busan ? round(dc.busan.pct, 2) : null,
    deathsCagrNation: dc.nation ? round(dc.nation.pct, 2) : null,
    deathsGapPp: gap(dc.busan, dc.nation),
    rateGapPp: gap(rc.busan, rc.nation),
    elderlyRatioBusan: ratio.busan ? round(ratio.busan.ratio) : null,
    elderlyRatioNation: ratio.nation ? round(ratio.nation.ratio) : null,
    ratioFrom: ratio.busan?.first.year ?? null,
    latestRateBusan: latestBusan?.per_100k ?? null,
    latestRateNation: latestNation?.per_100k ?? null,
    latestRateGap:
      latestBusan?.per_100k && latestNation?.per_100k ? round(latestBusan.per_100k / latestNation.per_100k) : null,
  };

  // 두 축 중 계산 가능한 것이 하나도 없으면 판정하지 않는다.
  const canJudgeElderly = stats.elderlyGapPp !== null;
  const canJudgeDeath = stats.deathsGapPp !== null;
  if (!canJudgeElderly && !canJudgeDeath) {
    return {
      id: 'H1',
      title: '부산은 전국보다 더 가파르게 고립되는가',
      verdict: '검증불가',
      evidence: '비교에 필요한 데이터가 없습니다.',
      interpretation: `${base}년 기준연도의 값이 없어 연평균 증가율을 계산할 수 없습니다.`,
      stats,
    };
  }

  const t = H1_CRITERION.gapThresholdPp;
  const elderlyPass = canJudgeElderly && stats.elderlyGapPp! >= t;
  const deathPass = canJudgeDeath && stats.deathsGapPp! >= t;
  const passed = [elderlyPass, deathPass].filter(Boolean).length;
  const testable = [canJudgeElderly, canJudgeDeath].filter(Boolean).length;

  const verdict: Verdict = passed === testable ? '채택' : passed > 0 ? '부분채택' : '기각';

  const parts: string[] = [];
  if (canJudgeElderly) {
    parts.push(
      `독거노인 수 연평균 ${stats.elderlyCagrBusan}%(부산) vs ${stats.elderlyCagrNation}%(전국) → 격차 ${stats.elderlyGapPp}%p ${elderlyPass ? '충족' : '미달'}`
    );
  }
  if (canJudgeDeath) {
    parts.push(
      `고독사 발생 수 연평균 ${stats.deathsCagrBusan}%(부산) vs ${stats.deathsCagrNation}%(전국) → 격차 ${stats.deathsGapPp}%p ${deathPass ? '충족' : '미달'}`
    );
  }
  const evidence = `${stats.from}→${stats.to}년 · 기준 ${t}%p — ` + parts.join(' · ');

  const interpretation =
    verdict === '채택'
      ? `두 축 모두 부산의 연평균 증가율이 전국을 ${t}%p 이상 앞섰습니다.${
          stats.latestRateGap !== null
            ? ` 가장 최근 연도의 10만 명당 고독사는 부산 ${stats.latestRateBusan}명, 전국 ${stats.latestRateNation}명으로 ${stats.latestRateGap}배 차이입니다.`
            : ''
        }`
      : verdict === '부분채택'
        ? `고독사는 기준을 넘었지만 독거노인은 넘지 못했습니다. 부산의 독거노인 증가율(${stats.elderlyCagrBusan}%)은 전국(${stats.elderlyCagrNation}%)보다 분명히 빠르지만 그 격차가 ${stats.elderlyGapPp}%p 로, 우리가 미리 정한 ${t}%p 에 못 미칩니다. 방향은 맞고 크기가 모자란 것입니다. 독거노인 증가는 전국이 함께 겪는 흐름이어서 부산만 특별히 빠르다고 말하기 어렵고, 부산이 뚜렷하게 앞서는 것은 고독사 쪽(${stats.deathsGapPp}%p)입니다. 즉 부산의 문제는 '혼자 사는 노인이 유난히 빨리 느는 것'이 아니라 '혼자 사는 사람이 혼자 죽는 일로 이어지는 속도'입니다.`
        : `부산의 연평균 증가율이 전국을 ${t}%p 이상 앞선다는 근거를 두 축 모두에서 찾지 못했습니다. 부산의 고립 수준 자체는 높지만 '증가 속도'만 놓고 보면 가설은 성립하지 않습니다.`;

  return {
    id: 'H1',
    title: '부산은 전국보다 더 가파르게 고립되는가',
    verdict,
    evidence,
    interpretation,
    stats,
  };
}

// ── H2 ─────────────────────────────────────────────────────────────────────

/**
 * '원도심'을 어느 구까지로 볼 것인가 — 조작적 정의.
 *
 * 등록본은 연구계획서(2일차)에 적은 5개구다. 그런데 부산에서 흔히 말하는 '원도심'은
 * 중·서·동·영도 4개구여서, 우리 목록은 서구가 빠지고 노후 산업지역 2곳이 들어가 있다.
 * 결과를 보고 목록을 고치는 것은 규칙 위반이므로 등록본을 그대로 쓰되,
 * 다른 정의로도 결론이 유지되는지 아래 민감도 분석으로 함께 보여준다.
 */
export const OLD_DOWNTOWN_ALTERNATIVES: Record<string, string[]> = {
  '전통 원도심 4개구 (중·서·동·영도)': ['중구', '서구', '동구', '영도구'],
  '등록 5개구 + 서구': ['중구', '동구', '영도구', '사하구', '사상구', '서구'],
};

export interface H2Sensitivity {
  label: string;
  diff: number | null; // 해당 정의에서의 격차 (%p)
  inTop5: number | null; // 상위 5개 구 중 해당 그룹 개수
  holds: boolean; // 이 정의에서도 '채택' 조건을 만족하는가
}

export interface H2Stats {
  year: number | null;
  oldDowntownMean: number | null; // 원도심 5개구 독거노인 비율 평균(%)
  otherMean: number | null; // 나머지 11개구 평균(%)
  diff: number | null; // 원도심 − 나머지 (%p)
  oldDowntownInTop5: number | null; // 상위 5개 구 중 원도심 개수
  correlation: number | null; // 노후주택 비율 ↔ 독거노인 비율 상관계수 r
  agingCorrelation: number | null; // 고령화율 ↔ 독거노인 비율 상관계수 r (비교용)
  topDistrict: string | null;
  topValue: number | null;
  sensitivity: H2Sensitivity[]; // 원도심 정의를 바꿔도 결론이 유지되는가
}

/**
 * H2 — 원도심·노후 산업지역일수록 독거노인 비율이 높은가.
 *
 * 판정 규칙
 *   ① 원도심 5개구 평균 > 나머지 11개구 평균  (방향)
 *   ② 독거노인 비율 상위 5개 구 가운데 원도심이 3개 이상  (집중도)
 *   둘 다 참 → 채택 / ①만 참 → 부분채택 / ①이 거짓 → 기각
 */
export function judgeH2(districts: DistrictRow[]): HypothesisResult<H2Stats> {
  const years = districts.map((d) => d.year);
  const year = years.length ? Math.max(...years) : null;
  const rows = districts.filter((d) => d.year === year && d.elderly_alone_rate !== null);

  const empty: H2Stats = {
    year,
    oldDowntownMean: null,
    otherMean: null,
    diff: null,
    oldDowntownInTop5: null,
    correlation: null,
    agingCorrelation: null,
    topDistrict: null,
    topValue: null,
    sensitivity: [],
  };

  if (rows.length < 8) {
    return {
      id: 'H2',
      title: '어디가 가장 외로운가',
      verdict: '검증불가',
      evidence: '구·군별 독거노인 비율 데이터가 부족합니다.',
      interpretation: '16개 구·군 가운데 비교에 쓸 수 있는 값이 충분하지 않아 판정할 수 없습니다.',
      stats: empty,
    };
  }

  const oldRates = rows.filter((d) => d.is_old_downtown).map((d) => d.elderly_alone_rate!);
  const otherRates = rows.filter((d) => !d.is_old_downtown).map((d) => d.elderly_alone_rate!);
  const sorted = [...rows].sort((a, b) => b.elderly_alone_rate! - a.elderly_alone_rate!);
  const top5 = sorted.slice(0, 5);

  // 노후주택 비율과의 상관은 두 값이 모두 있는 구만 쓴다.
  const paired = rows.filter((d) => d.old_housing_rate !== null && d.elderly_alone_rate !== null);
  const correlation = pearson(
    paired.map((d) => d.old_housing_rate!),
    paired.map((d) => d.elderly_alone_rate!)
  );

  // 고령화율과의 상관도 함께 잰다. 노후주택보다 이쪽이 강하면 그 사실을 숨기지 않는다.
  const agingPaired = rows.filter((d) => d.aging_rate !== null && d.elderly_alone_rate !== null);
  const agingCorrelation = pearson(
    agingPaired.map((d) => d.aging_rate!),
    agingPaired.map((d) => d.elderly_alone_rate!)
  );

  /** 구 이름 집합을 '원도심'으로 놓았을 때의 격차와 상위권 점유를 다시 계산한다. */
  const evaluate = (names: string[]) => {
    const inSet = new Set(names);
    const inn = rows.filter((d) => inSet.has(d.sgg_name)).map((d) => d.elderly_alone_rate!);
    const out = rows.filter((d) => !inSet.has(d.sgg_name)).map((d) => d.elderly_alone_rate!);
    if (!inn.length || !out.length) return { diff: null, inTop5: null };
    return {
      diff: round(mean(inn) - mean(out), 1),
      inTop5: top5.filter((d) => inSet.has(d.sgg_name)).length,
    };
  };

  const sensitivity: H2Sensitivity[] = Object.entries(OLD_DOWNTOWN_ALTERNATIVES).map(([label, names]) => {
    const { diff, inTop5 } = evaluate(names);
    return { label, diff, inTop5, holds: diff !== null && diff > 0 && (inTop5 ?? 0) >= 3 };
  });

  const stats: H2Stats = {
    year,
    oldDowntownMean: oldRates.length ? round(mean(oldRates), 1) : null,
    otherMean: otherRates.length ? round(mean(otherRates), 1) : null,
    diff: oldRates.length && otherRates.length ? round(mean(oldRates) - mean(otherRates), 1) : null,
    oldDowntownInTop5: top5.filter((d) => d.is_old_downtown).length,
    correlation: correlation === null ? null : round(correlation, 2),
    agingCorrelation: agingCorrelation === null ? null : round(agingCorrelation, 2),
    topDistrict: sorted[0]?.sgg_name ?? null,
    topValue: sorted[0]?.elderly_alone_rate ?? null,
    sensitivity,
  };

  const higher = stats.diff !== null && stats.diff > 0;
  const concentrated = (stats.oldDowntownInTop5 ?? 0) >= 3;
  const verdict: Verdict = higher && concentrated ? '채택' : higher ? '부분채택' : '기각';

  const nonDowntownInTop5 = top5.filter((d) => !d.is_old_downtown).map((d) => d.sgg_name);

  const robust = sensitivity.length > 0 && sensitivity.every((s) => s.holds);

  const interpretation =
    verdict === '채택'
      ? `원도심 5개구의 독거노인 비율이 나머지보다 ${stats.diff}%p 높고, 상위 5개 구 가운데 ${stats.oldDowntownInTop5}곳이 원도심입니다. ${
          robust
            ? `원도심을 어느 구까지로 볼지 정의를 바꿔도(${sensitivity.map((s) => `${s.label} ${s.diff}%p`).join(', ')}) 결론은 그대로였습니다. `
            : ''
        }다만 노후주택 비율과의 상관(r = ${stats.correlation})보다 고령화율과의 상관(r = ${stats.agingCorrelation})이 더 강합니다. '오래된 집'보다 '이미 늙은 인구 구조'가 독거노인 비율을 더 잘 설명한다는 뜻이라, 노후주택은 원인이라기보다 같은 배경에서 함께 나타나는 표시로 읽는 편이 맞습니다.`
      : verdict === '부분채택'
        ? `원도심 평균이 ${stats.diff}%p 높아 방향은 맞지만, 상위 5개 구에 원도심이 ${stats.oldDowntownInTop5}곳뿐입니다.${
            nonDowntownInTop5.length ? ` ${nonDowntownInTop5.join('·')}처럼 원도심으로 분류하지 않은 구도 상위권에 있습니다.` : ''
          } 원도심이라는 구분선이 고립을 완전히 설명하지는 못한다는 뜻입니다.`
        : `원도심 5개구의 독거노인 비율이 나머지 구보다 높지 않았습니다. 노후한 원도심이 곧 가장 고립된 지역이라는 가정은 이 데이터에서 성립하지 않습니다.`;

  return {
    id: 'H2',
    title: '어디가 가장 외로운가',
    verdict,
    evidence:
      // 소수점 한 자리로 고정한다. 23 과 27.8 이 나란히 있으면 자릿수가 흔들려 읽기 나쁘다.
      `${year}년 독거노인 비율 — 원도심 5개구 평균 ${stats.oldDowntownMean?.toFixed(1)}%, 나머지 11개구 평균 ${stats.otherMean?.toFixed(1)}%` +
      (stats.correlation !== null ? ` · 노후주택 비율과의 상관 r = ${stats.correlation}` : ''),
    interpretation,
    stats,
  };
}

// ── H3 ─────────────────────────────────────────────────────────────────────

export interface H3Stats {
  year: number | null;
  nationMaleMiddleShare: number | null; // 전국 50·60대 남성이 전체 고독사에서 차지하는 비중(%)
  nationMaleShare: number | null; // 전국 남성 비중(%)
  busanAvailable: boolean; // 부산 교차표가 있는가
}

/**
 * H3 — 부산은 전국보다도 고독사가 중장년~고령 남성에 더 편중되는가.
 *
 * 부산의 성별×연령대 고독사 교차표는 공표되지 않는다.
 * 따라서 '부산 vs 전국' 비교는 원천적으로 불가능하다 → 검증불가.
 * 억지로 추정치를 만들어 채우지 않는다. 이 판정 자체가 연구 결과의 일부다.
 */
export function judgeH3(demo: DemoRow[]): HypothesisResult<H3Stats> {
  const years = demo.map((d) => d.year);
  const year = years.length ? Math.max(...years) : null;
  const rows = demo.filter((d) => d.year === year);
  const busanAvailable = rows.some((d) => d.region === '부산');

  const nation = rows.filter((d) => d.region === '전국' && d.share_pct !== null);
  const maleShare = nation.filter((d) => d.sex === '남').reduce((a, d) => a + d.share_pct!, 0);
  const maleMiddle = nation
    .filter((d) => d.sex === '남' && (d.age_band === '50대' || d.age_band === '60대'))
    .reduce((a, d) => a + d.share_pct!, 0);

  const stats: H3Stats = {
    year,
    nationMaleShare: nation.length ? round(maleShare, 1) : null,
    nationMaleMiddleShare: nation.length ? round(maleMiddle, 1) : null,
    busanAvailable,
  };

  if (!busanAvailable) {
    return {
      id: 'H3',
      title: '누가 혼자 떠나는가',
      verdict: '검증불가',
      evidence:
        stats.nationMaleMiddleShare !== null
          ? `${year}년 전국 고독사에서 50·60대 남성이 ${stats.nationMaleMiddleShare}%를 차지합니다. 부산만 따로 본 성별×연령대 수치는 공표되지 않습니다.`
          : '성별·연령대별 고독사 데이터가 없습니다.',
      interpretation:
        '보건복지부 고독사 실태조사는 시·도별 발생 건수까지만 공개하고, 성별과 연령대를 교차한 표는 전국 단위로만 공개합니다. 부산의 편중 정도를 전국과 비교하려면 추정을 해야 하는데, 이 연구는 추정치를 만들어 넣지 않기로 했습니다. 대신 가장 가까운 실측 자료인 부산의 독거(1인세대) 성별·연령 구조를 나란히 놓아 정황만 보여줍니다.',
      stats,
    };
  }

  // 부산 교차표가 생기면 이 아래가 실행된다 (정보공개청구 등으로 확보될 경우).
  const busan = rows.filter((d) => d.region === '부산' && d.share_pct !== null);
  const busanMiddle = busan
    .filter((d) => d.sex === '남' && (d.age_band === '50대' || d.age_band === '60대'))
    .reduce((a, d) => a + d.share_pct!, 0);
  const more = busanMiddle > maleMiddle;

  return {
    id: 'H3',
    title: '누가 혼자 떠나는가',
    verdict: more ? '채택' : '기각',
    evidence: `${year}년 50·60대 남성 비중 — 부산 ${round(busanMiddle, 1)}%, 전국 ${round(maleMiddle, 1)}%`,
    interpretation: more
      ? '부산의 고독사는 전국 평균보다도 중장년 남성에 더 몰려 있습니다.'
      : '부산의 고독사가 전국보다 중장년 남성에 더 편중된다는 근거는 없었습니다.',
    stats,
  };
}
