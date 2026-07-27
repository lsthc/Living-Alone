import { describe, expect, it } from 'vitest';
import { H1_CRITERION, judgeH1, judgeH2, judgeH3, linearFit, pearson } from './hypothesis';
import type { DemoRow, DistrictRow, LonelyDeathRow, TrendRow } from '@/data/schema';

/**
 * 가설 판정 함수 테스트.
 *
 * 여기 쓰인 숫자는 전부 '판정 규칙이 제대로 도는지' 확인하려고 만든 가짜 값이다.
 * 실제 연구 수치가 아니다. 실제 수치는 public/data/ 에만 있다.
 */

// 테스트용 행을 짧게 만들기 위한 도우미
const trend = (year: number, region: '전국' | '부산', elderlyAlone: number | null): TrendRow => ({
  year,
  region,
  elderly_alone: elderlyAlone,
  elderly_total: 100000,
  elderly_alone_rate: null,
  single_household_rate: null,
});

const death = (
  year: number,
  region: '전국' | '부산',
  per100k: number | null,
  deaths = 100
): LonelyDeathRow => ({
  year,
  region,
  deaths,
  per_100k: per100k,
});

const district = (
  name: string,
  rate: number | null,
  oldDowntown: boolean,
  oldHousing: number | null = null
): DistrictRow => ({
  sgg_code: name,
  sgg_name: name,
  year: 2024,
  population: 200000,
  elderly_alone: 1000,
  elderly_alone_rate: rate,
  aging_rate: 25,
  single_household_rate: 40,
  old_housing_rate: oldHousing,
  is_old_downtown: oldDowntown,
});

describe('통계 도구', () => {
  it('완전한 양의 상관은 1', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });

  it('완전한 음의 상관은 -1', () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });

  it('표본이 3쌍 미만이면 상관을 계산하지 않는다', () => {
    expect(pearson([1, 2], [3, 4])).toBeNull();
  });

  it('분산이 0이면 상관을 계산하지 않는다', () => {
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull();
  });

  it('추세선 기울기를 구한다', () => {
    const fit = linearFit([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(fit?.slope).toBeCloseTo(2, 10);
    expect(fit?.intercept).toBeCloseTo(1, 10);
  });
});

describe('H1 — 부산이 더 가파른가', () => {
  // 2019→2024 = 5년. 100→200 이면 연평균 14.87%, 100→150 이면 8.45% (격차 6.4%p → 충족)
  // 100→195 는 연평균 14.29% 라 200 과의 격차가 0.58%p 밖에 안 된다 (→ 미달)
  const fast = 200;
  const slow = 150;
  const almost = 195;

  const elderly = (busanEnd: number, nationEnd: number) => [
    trend(2019, '부산', 100),
    trend(2024, '부산', busanEnd),
    trend(2019, '전국', 100),
    trend(2024, '전국', nationEnd),
  ];
  const lonely = (busanEnd: number, nationEnd: number) => [
    death(2019, '부산', 5, 100),
    death(2024, '부산', 9, busanEnd),
    death(2019, '전국', 5, 100),
    death(2024, '전국', 7, nationEnd),
  ];

  it('사전 등록한 판정 기준은 2019년 기준연도 · 격차 1%p 이다', () => {
    expect(H1_CRITERION.baseYear).toBe(2019);
    expect(H1_CRITERION.gapThresholdPp).toBe(1);
  });

  it('두 축 모두 격차가 기준을 넘으면 채택', () => {
    const r = judgeH1(elderly(fast, slow), lonely(fast, slow));
    expect(r.verdict).toBe('채택');
    expect(r.stats.elderlyGapPp).toBeGreaterThanOrEqual(1);
    expect(r.stats.deathsGapPp).toBeGreaterThanOrEqual(1);
  });

  it('한 축만 기준을 넘으면 부분채택', () => {
    const r = judgeH1(elderly(fast, almost), lonely(fast, slow));
    expect(r.verdict).toBe('부분채택');
  });

  it('★ 부산이 더 빨라도 격차가 1%p 에 못 미치면 그 축은 미달이다', () => {
    // 이것이 실제 연구에서 일어난 일이다. 독거노인 축의 격차는 0.11%p 였다.
    const r = judgeH1(elderly(fast, almost), lonely(fast, almost));
    expect(r.stats.elderlyCagrBusan!).toBeGreaterThan(r.stats.elderlyCagrNation!); // 부산이 더 빠르긴 하다
    expect(r.stats.elderlyGapPp!).toBeLessThan(1); // 그런데 기준에는 못 미친다
    expect(r.verdict).toBe('기각');
  });

  it('두 축 모두 부산이 느리면 기각한다 — 결론을 데이터에 맞춘다', () => {
    const r = judgeH1(elderly(slow, fast), lonely(slow, fast));
    expect(r.verdict).toBe('기각');
    expect(r.interpretation).toContain('찾지 못했');
  });

  it('판정은 발생 수로 하고, 10만 명당 발생률은 보조 지표로만 남긴다', () => {
    const r = judgeH1(elderly(fast, slow), lonely(fast, slow));
    expect(r.stats.rateGapPp).not.toBeNull();
    expect(r.evidence).toContain('고독사 발생 수');
  });

  it('빈 값은 건너뛰고 기준연도부터 최신 연도까지로 계산한다', () => {
    const r = judgeH1(
      [
        trend(2019, '부산', 100),
        trend(2021, '부산', null),
        trend(2024, '부산', fast),
        trend(2019, '전국', 100),
        trend(2024, '전국', slow),
      ],
      []
    );
    expect(r.stats.from).toBe(2019);
    expect(r.stats.to).toBe(2024);
    expect(r.verdict).toBe('채택'); // 계산 가능한 축이 하나뿐이고 그 축이 기준을 넘었다
  });

  it('기준연도 값이 없으면 판정하지 않는다', () => {
    const r = judgeH1(
      [trend(2020, '부산', 100), trend(2024, '부산', 200), trend(2020, '전국', 100), trend(2024, '전국', 150)],
      []
    );
    expect(r.verdict).toBe('검증불가');
  });

  it('비교할 데이터가 없으면 검증불가', () => {
    const r = judgeH1([], []);
    expect(r.verdict).toBe('검증불가');
  });
});

describe('H2 — 원도심이 더 외로운가', () => {
  // 원도심 5 + 나머지 11 = 16개 구·군
  const makeSet = (oldRates: number[], otherRates: number[]) => [
    ...oldRates.map((v, i) => district(`원도심${i}`, v, true)),
    ...otherRates.map((v, i) => district(`기타${i}`, v, false)),
  ];

  it('원도심이 높고 상위 5개를 차지하면 채택', () => {
    const r = judgeH2(makeSet([35, 34, 33, 32, 31], [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]));
    expect(r.verdict).toBe('채택');
    expect(r.stats.oldDowntownInTop5).toBe(5);
  });

  it('방향은 맞지만 상위권을 못 채우면 부분채택', () => {
    const r = judgeH2(makeSet([35, 34, 22, 21, 20], [33, 32, 31, 20, 20, 20, 20, 20, 20, 20, 20]));
    expect(r.verdict).toBe('부분채택');
    expect(r.stats.oldDowntownInTop5).toBe(2);
    expect(r.interpretation).toContain('기타0');
  });

  it('원도심이 오히려 낮으면 기각', () => {
    const r = judgeH2(makeSet([20, 20, 20, 20, 20], [35, 34, 33, 32, 31, 30, 30, 30, 30, 30, 30]));
    expect(r.verdict).toBe('기각');
  });

  it('노후주택 비율과의 상관을 계산한다', () => {
    const rows = makeSet([35, 34, 33, 32, 31], [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]).map((d, i) => ({
      ...d,
      old_housing_rate: 40 - i,
    }));
    const r = judgeH2(rows);
    expect(r.stats.correlation).not.toBeNull();
    expect(r.stats.agingCorrelation).toBeNull(); // 고령화율이 모두 같은 값이면 상관을 내지 않는다
  });

  it('원도심 정의를 바꿔도 결론이 유지되는지 민감도 분석을 함께 낸다', () => {
    const rows = [
      district('중구', 32.6, true),
      district('동구', 28.7, true),
      district('영도구', 27.8, true),
      district('서구', 27.5, false),
      district('사상구', 25.5, true),
      district('사하구', 24.3, true),
      ...['북구', '부산진구', '금정구', '해운대구', '기장군', '연제구', '수영구', '동래구', '남구', '강서구'].map((n) =>
        district(n, 22, false)
      ),
    ];
    const r = judgeH2(rows);
    expect(r.verdict).toBe('채택');
    expect(r.stats.sensitivity).toHaveLength(2);
    // 서구를 원도심에 넣든 빼든 결론이 뒤집히지 않아야 한다
    expect(r.stats.sensitivity.every((s) => s.holds)).toBe(true);
    expect(r.interpretation).toContain('정의를 바꿔도');
  });

  it('구·군 수가 모자라면 검증불가', () => {
    const r = judgeH2([district('중구', 30, true), district('동구', 28, true)]);
    expect(r.verdict).toBe('검증불가');
  });
});

describe('H3 — 중장년 남성 편중', () => {
  const demo = (region: '전국' | '부산', sex: '남' | '여', band: DemoRow['age_band'], share: number): DemoRow => ({
    year: 2024,
    region,
    sex,
    age_band: band,
    deaths: 100,
    share_pct: share,
  });

  it('부산 교차표가 없으면 검증불가로 두고 추정하지 않는다', () => {
    const r = judgeH3([
      demo('전국', '남', '50대', 30),
      demo('전국', '남', '60대', 28),
      demo('전국', '여', '50대', 4),
    ]);
    expect(r.verdict).toBe('검증불가');
    expect(r.stats.busanAvailable).toBe(false);
    expect(r.stats.nationMaleMiddleShare).toBe(58);
  });

  it('부산 교차표가 확보되면 실제로 비교한다', () => {
    const r = judgeH3([
      demo('전국', '남', '50대', 30),
      demo('전국', '남', '60대', 28),
      demo('부산', '남', '50대', 33),
      demo('부산', '남', '60대', 30),
    ]);
    expect(r.verdict).toBe('채택');
  });

  it('부산이 전국보다 편중이 약하면 기각', () => {
    const r = judgeH3([
      demo('전국', '남', '50대', 30),
      demo('전국', '남', '60대', 28),
      demo('부산', '남', '50대', 25),
      demo('부산', '남', '60대', 24),
    ]);
    expect(r.verdict).toBe('기각');
  });
});
