/**
 * KOSIS(국가통계포털) OpenAPI 에서 원자료 JSON 을 내려받는다.
 *
 *  ① DT_1YL12701  독거노인가구비율(시도/시/군/구)  — 인구총조사 기준 65세 이상 1인가구
 *     → 행안부 주민등록 통계가 2016년부터만 있는 빈칸(2010~2015)을 메우고,
 *       '독거노인'의 공식 정의(인구총조사 일반가구 기준)로 계열을 통일한다.
 *
 *  ② DT_1JU1520   주택의 종류·연면적·건축연도별 주택 - 시군구 (주택총조사)
 *     → 노후주택 비율. 제공 구간이 1979년 이전 / 1980~1989 / 1990~1999 이므로
 *       '30년 이상'은 정확히 계산할 수 없다. 이 앱은 1989년 이전 준공(2024년 기준 35년 이상)을 쓴다.
 *
 * API 키는 .env 의 KOSIS_API_KEY 에서 읽는다. 코드에 넣지 않는다.
 * 실행: node scripts/fetch_kosis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('_raw/kosis');
const BASE = 'https://kosis.kr/openapi/Param/statisticsParameterData.do';

/** .env 에서 KOSIS_API_KEY 를 읽는다. */
function readKey() {
  const env = fs.readFileSync(path.resolve('.env'), 'utf8');
  const m = env.match(/^KOSIS_API_KEY=(.+)$/m);
  if (!m) throw new Error('.env 에 KOSIS_API_KEY 가 없습니다.');
  return m[1].trim();
}

async function fetchTable(name, params) {
  const url = `${BASE}?${new URLSearchParams({ method: 'getList', format: 'json', jsonVD: 'Y', ...params })}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.err) throw new Error(`${name}: ${json.err} ${json.errMsg}`);
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(json));
  return json.length;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const apiKey = readKey();

  // ① 독거노인가구 — T001: 65세이상 1인가구, T002: 전체 일반가구, T10: 비율
  console.log(
    'elderly_alone   ',
    await fetchTable('elderly_alone', {
      apiKey, orgId: '101', tblId: 'DT_1YL12701',
      itmId: 'T001 T002 T10', objL1: 'ALL',
      prdSe: 'Y', startPrdDe: '2010', endPrdDe: '2024',
    }),
    '행'
  );

  // ② 노후주택 — T000: 주택 계, T100: 1980~1989년, T110: 1979년 이전
  //    objL2=00(연면적 합계), objL3=00(주택종류 계)
  console.log(
    'old_housing     ',
    await fetchTable('old_housing', {
      apiKey, orgId: '101', tblId: 'DT_1JU1520',
      itmId: 'T000 T100 T110', objL1: 'ALL', objL2: '00', objL3: '00',
      prdSe: 'Y', startPrdDe: '2016', endPrdDe: '2024',
    }),
    '행'
  );
}

main();
