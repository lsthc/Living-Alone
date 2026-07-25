import { describe, expect, it } from 'vitest';
import { judgeH1, judgeH2, judgeH3, linearFit, pearson } from './hypothesis';
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

const death = (year: number, region: '전국' | '부산', per100k: number | null): LonelyDeathRow => ({
  year,
  region,
  deaths: 100,
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
  it('두 축 모두 부산이 빠르면 채택', () => {
    const r = judgeH1(
      [trend(2010, '부산', 100), trend(2024, '부산', 300), trend(2010, '전국', 100), trend(2024, '전국', 200)],
      [death(2019, '부산', 5), death(2024, '부산', 15), death(2019, '전국', 5), death(2024, '전국', 10)]
    );
    expect(r.verdict).toBe('채택');
    expect(r.stats.elderlyAloneBusan).toBe(3);
    expect(r.stats.elderlyAloneNation).toBe(2);
  });

  it('한 축만 부산이 빠르면 부분채택', () => {
    const r = judgeH1(
      [trend(2010, '부산', 100), trend(2024, '부산', 300), trend(2010, '전국', 100), trend(2024, '전국', 200)],
      [death(2019, '부산', 5), death(2024, '부산', 6), death(2019, '전국', 5), death(2024, '전국', 10)]
    );
    expect(r.verdict).toBe('부분채택');
  });

  it('두 축 모두 부산이 느리면 기각한다 — 결론을 데이터에 맞춘다', () => {
    const r = judgeH1(
      [trend(2010, '부산', 100), trend(2024, '부산', 150), trend(2010, '전국', 100), trend(2024, '전국', 200)],
      [death(2019, '부산', 5), death(2024, '부산', 6), death(2019, '전국', 5), death(2024, '전국', 10)]
    );
    expect(r.verdict).toBe('기각');
    expect(r.interpretation).toContain('찾지 못했');
  });

  it('빈 값은 건너뛰고 값이 있는 연도끼리만 비교한다', () => {
    const r = judgeH1(
      [
        trend(2010, '부산', 100),
        trend(2012, '부산', null),
        trend(2024, '부산', 300),
        trend(2010, '전국', 100),
        trend(2024, '전국', 200),
      ],
      []
    );
    expect(r.stats.elderlyAloneFrom).toBe(2010);
    expect(r.stats.elderlyAloneTo).toBe(2024);
    expect(r.verdict).toBe('채택'); // 계산 가능한 축이 하나뿐이고 그 축을 통과
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
