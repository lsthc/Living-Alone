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

// ── H1 ─────────────────────────────────────────────────────────────────────

export interface H1Stats {
  elderlyAloneBusan: number | null; // 부산 독거노인 증가배율
  elderlyAloneNation: number | null; // 전국 독거노인 증가배율
  elderlyAloneFrom: number | null; // 비교 시작연도
  elderlyAloneTo: number | null;
  deathRateBusan: number | null; // 부산 10만 명당 고독사 증가배율
  deathRateNation: number | null;
  deathRateFrom: number | null;
  deathRateTo: number | null;
  latestRateBusan: number | null; // 최신 연도 10만 명당 발생률
  latestRateNation: number | null;
  latestRateGap: number | null; // 부산 ÷ 전국
}

/**
 * H1 — 부산의 독거노인 수와 고독사 발생률이 전국 평균보다 더 가파르게 증가하는가.
 *
 * 판정 규칙 (두 축을 모두 본다)
 *   ① 독거노인 증가배율: 부산 > 전국  ?
 *   ② 10만 명당 고독사 증가배율: 부산 > 전국  ?
 *   둘 다 참 → 채택 / 하나만 참 → 부분채택 / 둘 다 거짓 → 기각
 */
export function judgeH1(trend: TrendRow[], deaths: LonelyDeathRow[]): HypothesisResult<H1Stats> {
  const busanTrend = trend.filter((r) => r.region === '부산');
  const nationTrend = trend.filter((r) => r.region === '전국');
  const busanDeath = deaths.filter((r) => r.region === '부산');
  const nationDeath = deaths.filter((r) => r.region === '전국');

  const ea = {
    busan: growthRatio(busanTrend, (r) => r.elderly_alone),
    nation: growthRatio(nationTrend, (r) => r.elderly_alone),
  };
  const dr = {
    busan: growthRatio(busanDeath, (r) => r.per_100k),
    nation: growthRatio(nationDeath, (r) => r.per_100k),
  };

  const latestBusan = busanDeath.filter((r) => r.per_100k !== null).sort((a, b) => b.year - a.year)[0];
  const latestNation = nationDeath.filter((r) => r.per_100k !== null).sort((a, b) => b.year - a.year)[0];

  const stats: H1Stats = {
    elderlyAloneBusan: ea.busan ? round(ea.busan.ratio) : null,
    elderlyAloneNation: ea.nation ? round(ea.nation.ratio) : null,
    elderlyAloneFrom: ea.busan?.first.year ?? null,
    elderlyAloneTo: ea.busan?.last.year ?? null,
    deathRateBusan: dr.busan ? round(dr.busan.ratio) : null,
    deathRateNation: dr.nation ? round(dr.nation.ratio) : null,
    deathRateFrom: dr.busan?.first.year ?? null,
    deathRateTo: dr.busan?.last.year ?? null,
    latestRateBusan: latestBusan?.per_100k ?? null,
    latestRateNation: latestNation?.per_100k ?? null,
    latestRateGap:
      latestBusan?.per_100k && latestNation?.per_100k ? round(latestBusan.per_100k / latestNation.per_100k) : null,
  };

  // 두 축 중 계산 가능한 것이 하나도 없으면 판정하지 않는다.
  const canJudgeElderly = stats.elderlyAloneBusan !== null && stats.elderlyAloneNation !== null;
  const canJudgeDeath = stats.deathRateBusan !== null && stats.deathRateNation !== null;
  if (!canJudgeElderly && !canJudgeDeath) {
    return {
      id: 'H1',
      title: '부산은 전국보다 더 가파르게 고립되는가',
      verdict: '검증불가',
      evidence: '비교에 필요한 데이터가 없습니다.',
      interpretation: '독거노인 추세와 고독사 발생률 자료가 모두 비어 있어 판정할 수 없습니다.',
      stats,
    };
  }

  const elderlyFaster = canJudgeElderly && stats.elderlyAloneBusan! > stats.elderlyAloneNation!;
  const deathFaster = canJudgeDeath && stats.deathRateBusan! > stats.deathRateNation!;
  const passed = [elderlyFaster, deathFaster].filter(Boolean).length;
  const testable = [canJudgeElderly, canJudgeDeath].filter(Boolean).length;

  const verdict: Verdict = passed === testable ? '채택' : passed > 0 ? '부분채택' : '기각';

  const parts: string[] = [];
  if (canJudgeElderly) {
    parts.push(
      `${stats.elderlyAloneFrom}→${stats.elderlyAloneTo}년 독거노인 ${stats.elderlyAloneBusan}배(부산) vs ${stats.elderlyAloneNation}배(전국)`
    );
  }
  if (canJudgeDeath) {
    parts.push(
      `${stats.deathRateFrom}→${stats.deathRateTo}년 10만 명당 고독사 ${stats.deathRateBusan}배(부산) vs ${stats.deathRateNation}배(전국)`
    );
  }

  const interpretation =
    verdict === '채택'
      ? `독거노인과 고독사 발생률 두 축 모두에서 부산의 증가 속도가 전국을 앞섰습니다. ${
          stats.latestRateGap !== null
            ? `가장 최근 연도의 10만 명당 고독사는 부산 ${stats.latestRateBusan}명, 전국 ${stats.latestRateNation}명으로 ${stats.latestRateGap}배 차이입니다.`
            : ''
        } 전국에서 가장 먼저 초고령사회에 들어선 도시라는 조건이 지표에 그대로 나타납니다.`
      : verdict === '부분채택'
        ? `두 축 가운데 ${elderlyFaster ? '독거노인 증가' : '고독사 발생률 증가'}에서만 부산이 전국보다 빨랐습니다. 가설의 방향은 맞지만 모든 지표에서 성립하지는 않습니다. 어느 축이 어긋났는지가 이 연구의 실제 발견입니다.`
        : `부산의 증가 속도가 전국 평균을 앞선다는 근거를 찾지 못했습니다. 부산의 고립 수준 자체는 높지만, 최근 기간의 '증가 속도'만 놓고 보면 가설은 성립하지 않습니다.`;

  return {
    id: 'H1',
    title: '부산은 전국보다 더 가파르게 고립되는가',
    verdict,
    evidence: parts.join(' · '),
    interpretation,
    stats,
  };
}

// ── H2 ─────────────────────────────────────────────────────────────────────

export interface H2Stats {
  year: number | null;
  oldDowntownMean: number | null; // 원도심 5개구 독거노인 비율 평균(%)
  otherMean: number | null; // 나머지 11개구 평균(%)
  diff: number | null; // 원도심 − 나머지 (%p)
  oldDowntownInTop5: number | null; // 상위 5개 구 중 원도심 개수
  correlation: number | null; // 노후주택 비율 ↔ 독거노인 비율 상관계수 r
  topDistrict: string | null;
  topValue: number | null;
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
    topDistrict: null,
    topValue: null,
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

  const stats: H2Stats = {
    year,
    oldDowntownMean: oldRates.length ? round(mean(oldRates), 1) : null,
    otherMean: otherRates.length ? round(mean(otherRates), 1) : null,
    diff: oldRates.length && otherRates.length ? round(mean(oldRates) - mean(otherRates), 1) : null,
    oldDowntownInTop5: top5.filter((d) => d.is_old_downtown).length,
    correlation: correlation === null ? null : round(correlation, 2),
    topDistrict: sorted[0]?.sgg_name ?? null,
    topValue: sorted[0]?.elderly_alone_rate ?? null,
  };

  const higher = stats.diff !== null && stats.diff > 0;
  const concentrated = (stats.oldDowntownInTop5 ?? 0) >= 3;
  const verdict: Verdict = higher && concentrated ? '채택' : higher ? '부분채택' : '기각';

  const nonDowntownInTop5 = top5.filter((d) => !d.is_old_downtown).map((d) => d.sgg_name);

  const interpretation =
    verdict === '채택'
      ? `원도심 5개구의 독거노인 비율이 나머지보다 ${stats.diff}%p 높고, 상위 5개 구 가운데 ${stats.oldDowntownInTop5}곳이 원도심입니다. 오래된 주택이 많은 지역일수록 혼자 사는 노인이 많다는 관계가 지도에서도 눈으로 확인됩니다.`
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
