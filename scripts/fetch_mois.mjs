/**
 * 행정안전부 주민등록 인구통계(jumin.mois.go.kr)에서 원자료 CSV를 내려받는다.
 *
 * 받아오는 통계 3종 (각각 매년 12월 기준):
 *   - age        : 연령별 인구         → 65세 이상 인구, 고령화율 계산용
 *   - singleAge  : 단독(1인)세대 연령별 → 독거노인 수 계산용  ★ 이 앱의 핵심 지표
 *   - households : 세대원수별 세대수    → 1인세대 비율 계산용
 *
 * 지역 범위 2종:
 *   - nation : 전국 + 17개 시·도 (부산 포함)
 *   - busan  : 부산 16개 구·군
 *
 * 결과는 _raw/mois/ 에 EUC-KR CSV 그대로 저장한다. (가공은 build_csv.mjs 가 담당)
 * 실행: node scripts/fetch_mois.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://jumin.mois.go.kr';
const OUT = path.resolve('_raw/mois');
// 연도 범위 — 연구 대상 기간
const YEARS = Array.from({ length: 15 }, (_, i) => 2010 + i); // 2010~2024

// 통계 종류별 요청 파라미터 차이
const DATASETS = {
  age: { endpoint: 'downloadCsvAge.do', referer: 'ageStatMonth.do', category: 'year', extra: { gender: '', sum: 'sum', sltArgTypes: '5', sltArgTypeA: '0', sltArgTypeB: '100' } },
  singleAge: { endpoint: 'downloadCsvEtc.do', referer: 'etcStatSingleAge.do', category: 'singleAge', extra: { gender: '', sum: 'sum', sltArgTypes: '5', sltArgTypeA: '0', sltArgTypeB: '100' } },
  households: { endpoint: 'downloadCsvEtc.do', referer: 'etcStatHouseholds.do', category: 'households', extra: {} },
  // 성별로 나눈 1인세대 연령 구조. 10세 단위라 고독사 통계의 연령대(40대·50대…)와 바로 맞물린다.
  // Chapter 3 에서 '전국 고독사 피라미드' 옆에 '부산 독거 구조'를 병치하는 데 쓴다.
  singleAgeSex: {
    endpoint: 'downloadCsvEtc.do', referer: 'etcStatSingleAge.do', category: 'singleAge',
    extra: { gender: 'gender', sum: 'sum', sltArgTypes: '10', sltArgTypeA: '0', sltArgTypeB: '100' },
  },
};

// 지역 범위별 파라미터 (sltOrgType 1=시도 단위, 2=시군구 단위)
const SCOPES = {
  nation: { sltOrgType: '1', sltOrgLvl1: 'A', sltOrgLvl2: '' },
  busan: { sltOrgType: '2', sltOrgLvl1: '2600000000', sltOrgLvl2: 'A' },
};

/** 세션 쿠키를 얻는다. 이 사이트는 쿠키 없이 다운로드 요청을 받지 않는다. */
async function getCookie() {
  const res = await fetch(`${BASE}/ageStatMonth.do`);
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(';')[0]).join('; ');
}

async function download(cookie, dsName, scopeName, year) {
  const ds = DATASETS[dsName];
  const body = new URLSearchParams({
    searchYearMonth: 'year',
    ...SCOPES[scopeName],
    ...ds.extra,
    searchYearStart: String(year),
    searchYearEnd: String(year),
    searchMonthStart: '12',
    searchMonthEnd: '12',
    startOrtnDe: `${year}1201`,
    endOrtnDe: `${year}1231`,
    category: ds.category,
    state: '1',
    sltUndefType: '',
    sltOrderType: '1',
    sltOrderValue: 'ASC',
    tableChart: 'T',
  });

  const res = await fetch(`${BASE}/${ds.endpoint}?searchYearMonth=year&xlsStats=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${BASE}/${ds.referer}`,
      Cookie: cookie,
    },
    body,
  });

  const buf = Buffer.from(await res.arrayBuffer());
  // 오류 시 HTML 에러 페이지가 200으로 내려온다 → 내용으로 판별
  if (buf.slice(0, 200).toString('latin1').includes('<!DOCTYPE')) {
    throw new Error(`${dsName}/${scopeName}/${year}: HTML 응답(파라미터 오류 또는 데이터 없음)`);
  }
  const file = path.join(OUT, `${dsName}_${scopeName}_${year}.csv`);
  fs.writeFileSync(file, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const cookie = await getCookie();
  const failures = [];

  for (const year of YEARS) {
    for (const dsName of Object.keys(DATASETS)) {
      for (const scopeName of Object.keys(SCOPES)) {
        const file = path.join(OUT, `${dsName}_${scopeName}_${year}.csv`);
        if (fs.existsSync(file) && fs.statSync(file).size > 500) continue; // 이미 받은 건 건너뛴다
        try {
          const size = await download(cookie, dsName, scopeName, year);
          console.log(`ok   ${dsName} ${scopeName} ${year} (${size}B)`);
        } catch (e) {
          console.log(`FAIL ${dsName} ${scopeName} ${year} — ${e.message}`);
          failures.push(`${dsName}/${scopeName}/${year}`);
        }
        await new Promise((r) => setTimeout(r, 300)); // 서버 부담을 줄인다
      }
    }
  }

  console.log(`\n완료. 실패 ${failures.length}건`);
  if (failures.length) console.log(failures.join('\n'));
}

main();
