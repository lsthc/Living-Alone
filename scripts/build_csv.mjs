/**
 * _raw/ 에 받아둔 원자료를 앱이 읽는 public/data/*.csv 로 변환한다.
 *
 * 입력
 *   _raw/mois/{age|singleAge|households}_{nation|busan}_{연도}.csv  ← 행정안전부 주민등록 (fetch_mois.mjs)
 *   아래 LONELY_DEATH / DEMO_NATIONAL 상수                          ← 보건복지부 고독사 실태조사 보도자료 (수기 전사)
 *   _raw/skorea_municipalities.json                                 ← 통계청 2013 센서스 행정구역 경계
 *
 * 출력
 *   public/data/01_trend_national_busan.csv
 *   public/data/02_lonely_death_trend.csv
 *   public/data/03_busan_districts.csv
 *   public/data/04_lonely_death_demo.csv
 *   public/data/busan_sgg.geojson
 *
 * 실행: node scripts/build_csv.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.resolve('_raw');
const OUT = path.resolve('public/data');

// ── 상수: 보건복지부 고독사 실태조사 보도자료에서 전사한 수치 ───────────────
// 출처 ① 2024.10.17 「2024년 고독사 사망자 실태조사 결과 발표」  (2017~2023년)
// 출처 ② 2025.11.27 「2024년 고독사 전년 대비 증가…」            (2020~2024년)
// ※ 지어낸 값은 하나도 없다. 보도자료 표를 그대로 옮겼다.
const LONELY_DEATH = {
  전국: { 2019: 2949, 2020: 3279, 2021: 3378, 2022: 3559, 2023: 3661, 2024: 3924 },
  부산: { 2019: 254, 2020: 315, 2021: 329, 2022: 317, 2023: 287, 2024: 367 },
};

// 전국 성별·연령대별 고독사 (명). 부산 단위 교차표는 공표되지 않아 전국만 존재한다.
// 2022·2023: 출처 ① 그림 표, 2024: 출처 ② 표
const DEMO_NATIONAL = {
  2022: { 남: { '40대': 423, '50대': 946, '60대': 979, '70대': 339, '80대이상': 118 }, 여: { '40대': 97, '50대': 121, '60대': 128, '70대': 91, '80대이상': 68 } },
  2023: { 남: { '40대': 402, '50대': 970, '60대': 1004, '70대': 387, '80대이상': 135 }, 여: { '40대': 98, '50대': 123, '60대': 138, '70대': 79, '80대이상': 67 } },
  2024: { 남: { '40대': 400, '50대': 1028, '60대': 1089, '70대': 403, '80대이상': 130 }, 여: { '40대': 104, '50대': 141, '60대': 147, '70대': 79, '80대이상': 65 } },
};
// 해당 연도 전체 고독사 사망자 수(미상 포함) — share_pct 의 분모
const DEMO_TOTAL = { 2022: 3559, 2023: 3661, 2024: 3924 };

// 원도심·노후 산업지역 (연구 가설 H2)
const OLD_DOWNTOWN = new Set(['영도구', '동구', '중구', '사상구', '사하구']);

// ── 원자료 읽기 ────────────────────────────────────────────────────────────
/** 행안부 CSV 는 EUC-KR 이므로 디코딩해서 2차원 배열로 만든다. */
function readMois(dataset, scope, year) {
  const file = path.join(RAW, 'mois', `${dataset}_${scope}_${year}.csv`);
  if (!fs.existsSync(file)) return null;
  const text = new TextDecoder('euc-kr').decode(fs.readFileSync(file));
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('","').map((c) => c.replace(/^"|"$/g, '')));
}

// ── KOSIS 원자료 (fetch_kosis.mjs 가 받아둔 것) ────────────────────────────
// 부산 16개 구·군 이름. KOSIS 는 '중구'처럼 시·도를 넘어 겹치는 이름이 많아
// 지역코드(C1)로 먼저 부산만 걸러낸 뒤에 이름을 키로 쓴다.
const BUSAN_SGG = new Set([
  '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
  '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군',
]);

/** KOSIS JSON → Map<`${지역}|${연도}|${항목ID}`, 값>.
 *  지역 키는 '전국' / '부산광역시' / 부산 구·군 이름만 남긴다. */
function readKosis(name) {
  const file = path.join(RAW, 'kosis', `${name}.json`);
  if (!fs.existsSync(file)) return new Map();
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const map = new Map();
  for (const r of rows) {
    const code = String(r.C1);
    let key = null;
    if (code === '00') key = '전국';
    else if (code === '21') key = '부산광역시';
    // 부산 구·군은 21xxx (단 21003/21004/21005 는 동부·읍부·면부라 이름으로 걸러진다)
    else if (code.length === 5 && code.startsWith('21') && BUSAN_SGG.has(r.C1_NM)) key = r.C1_NM;
    if (key) map.set(`${key}|${r.PRD_DE}|${r.ITM_ID}`, Number(r.DT));
  }
  return map;
}
const KOSIS_ELDERLY = readKosis('elderly_alone'); // T001 = 65세 이상 1인가구
const KOSIS_HOUSING = readKosis('old_housing'); // T000 계 / T100 1980~1989 / T110 1979년 이전

/** 독거노인 수. 인구총조사 기준이라 2011~2014년은 조사가 없어 값이 없다. */
const elderlyAloneOf = (regionName, year) => KOSIS_ELDERLY.get(`${regionName}|${year}|T001`) ?? '';

/** 노후주택 비율. 제공 구간상 '30년 이상'은 계산 불가 → 1989년 이전 준공 비율을 쓴다. */
function oldHousingRateOf(regionName, year) {
  const total = KOSIS_HOUSING.get(`${regionName}|${year}|T000`);
  const before1990 =
    (KOSIS_HOUSING.get(`${regionName}|${year}|T100`) ?? 0) + (KOSIS_HOUSING.get(`${regionName}|${year}|T110`) ?? 0);
  return total ? round((before1990 / total) * 100) : '';
}

const num = (s) => Number(String(s ?? '').replace(/,/g, '')) || 0;
/** '부산광역시 중구 (2611000000)' → { name: '중구', code: '2611000000' } */
function parseRegion(cell) {
  const m = cell.match(/^(.*?)\s*\((\d+)\)\s*$/);
  const full = (m ? m[1] : cell).trim();
  const parts = full.split(/\s+/);
  return { full, name: parts[parts.length - 1], code: m ? m[2] : '' };
}

/** age / singleAge CSV 한 행에서 65세 이상 인구를 합산한다.
 *  컬럼: [지역, 총인구수, 연령구간인구수, 0~4, 5~9, ... , 100세이상]
 *  0~4 가 인덱스 3 이므로 65~69 는 3+13 = 16 번째부터 끝까지. */
function sum65plus(row) {
  return row.slice(3 + 13).reduce((a, c) => a + num(c), 0);
}

/** 특정 통계·범위·연도에서 지역명 → 행 맵을 만든다. */
function rowsByName(dataset, scope, year) {
  const rows = readMois(dataset, scope, year);
  if (!rows) return null;
  const map = new Map();
  for (const row of rows.slice(1)) {
    const { full, name } = parseRegion(row[0]);
    map.set(full === '전국' ? '전국' : name, row);
  }
  return map;
}

const round = (v, d = 1) => (Number.isFinite(v) ? Number(v.toFixed(d)) : '');
const csv = (header, rows) => [header.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';

// ── 01. 전국 vs 부산 독거노인·1인가구 추세 ────────────────────────────────
function build01() {
  const out = [];
  for (let year = 2010; year <= 2024; year++) {
    for (const region of ['전국', '부산']) {
      const key = region === '전국' ? '전국' : '부산광역시';
      const age = rowsByName('age', 'nation', year)?.get(region === '전국' ? '전국' : '부산광역시');
      const hh = rowsByName('households', 'nation', year)?.get(region === '전국' ? '전국' : '부산광역시');
      const single = rowsByName('singleAge', 'nation', year)?.get(region === '전국' ? '전국' : '부산광역시');
      if (!age) continue;

      const elderlyTotal = sum65plus(age);
      // 독거노인 수는 KOSIS 인구총조사 기준. 2011~2014년은 조사가 없어 빈칸이다.
      const elderlyAlone = elderlyAloneOf(region === '전국' ? '전국' : '부산광역시', year);
      const singleHouseholds = hh ? num(hh[2]) : 0;
      const totalHouseholds = hh ? num(hh[1]) : 0;

      out.push([
        year,
        region,
        elderlyAlone,
        elderlyTotal,
        elderlyAlone ? round((elderlyAlone / elderlyTotal) * 100) : '',
        totalHouseholds ? round((singleHouseholds / totalHouseholds) * 100) : '',
      ]);
    }
  }
  fs.writeFileSync(
    path.join(OUT, '01_trend_national_busan.csv'),
    csv(['year', 'region', 'elderly_alone', 'elderly_total', 'elderly_alone_rate', 'single_household_rate'], out)
  );
  return out.length;
}

// ── 02. 고독사 발생 추세 (인구 10만 명당 발생률은 행안부 인구로 계산) ──────
function build02() {
  const out = [];
  for (let year = 2019; year <= 2024; year++) {
    for (const region of ['전국', '부산']) {
      const deaths = LONELY_DEATH[region][year];
      if (deaths == null) continue;
      const age = rowsByName('age', 'nation', year)?.get(region === '전국' ? '전국' : '부산광역시');
      const pop = age ? num(age[1]) : 0;
      out.push([year, region, deaths, pop ? round((deaths / pop) * 100000, 2) : '']);
    }
  }
  fs.writeFileSync(path.join(OUT, '02_lonely_death_trend.csv'), csv(['year', 'region', 'deaths', 'per_100k'], out));
  return out.length;
}

// ── 03. 부산 16개 구·군 지표 ───────────────────────────────────────────────
function build03(codeByName) {
  const out = [];
  for (let year = 2016; year <= 2024; year++) {
    const ages = rowsByName('age', 'busan', year);
    const hhs = rowsByName('households', 'busan', year);
    if (!ages) continue;
    for (const [name, age] of ages) {
      if (name === '부산광역시' || !codeByName.has(name)) continue;
      const elderlyTotal = sum65plus(age);
      const population = num(age[1]);
      const elderlyAlone = elderlyAloneOf(name, year);
      const hh = hhs?.get(name);
      out.push([
        codeByName.get(name),
        name,
        year,
        population, // 산점도의 점 크기에 쓴다
        elderlyAlone,
        elderlyAlone ? round((elderlyAlone / elderlyTotal) * 100) : '',
        population ? round((elderlyTotal / population) * 100) : '',
        hh ? round((num(hh[2]) / num(hh[1])) * 100) : '',
        oldHousingRateOf(name, year),
        OLD_DOWNTOWN.has(name),
      ]);
    }
  }
  fs.writeFileSync(
    path.join(OUT, '03_busan_districts.csv'),
    csv(
      ['sgg_code', 'sgg_name', 'year', 'population', 'elderly_alone', 'elderly_alone_rate', 'aging_rate', 'single_household_rate', 'old_housing_rate', 'is_old_downtown'],
      out
    )
  );
  return out.length;
}

// ── 04. 성별·연령대별 고독사 (전국만 공표됨) ───────────────────────────────
function build04() {
  const out = [];
  for (const [year, bySex] of Object.entries(DEMO_NATIONAL)) {
    for (const [sex, byBand] of Object.entries(bySex)) {
      for (const [band, deaths] of Object.entries(byBand)) {
        out.push([year, '전국', sex, band, deaths, round((deaths / DEMO_TOTAL[year]) * 100)]);
      }
    }
  }
  fs.writeFileSync(
    path.join(OUT, '04_lonely_death_demo.csv'),
    csv(['year', 'region', 'sex', 'age_band', 'deaths', 'share_pct'], out)
  );
  return out.length;
}

// ── 05. 1인세대 성별·연령 구조 (Chapter 3 에서 고독사 피라미드와 병치) ─────
// 부산의 성별×연령대 '고독사' 교차표는 공표되지 않는다. 그래서 H3 는 직접 검증할 수 없고,
// 대신 가장 가까운 실측 대리지표인 '1인세대(독거) 성별·연령 구조'를 같은 형식으로 보여준다.
// 두 지표는 다른 것이므로 화면에서도 분명히 구분해 표기해야 한다.
function build05() {
  // 행안부 CSV 컬럼: [0]지역, 그다음 계·남·여 블록이 차례로 붙는다.
  // 한 블록 = 총인구수, 연령구간인구수, 11개 구간(0~9 … 100세이상) = 13칸
  const BANDS = ['0~9', '10~19', '20~29', '30~39', '40~49', '50~59', '60~69', '70~79', '80~89', '90~99', '100+'];
  const BLOCK = 2 + BANDS.length; // 13
  const WANT = { '40대': ['40~49'], '50대': ['50~59'], '60대': ['60~69'], '70대': ['70~79'], '80대이상': ['80~89', '90~99', '100+'] };
  const out = [];

  for (let year = 2019; year <= 2024; year++) {
    const rows = rowsByName('singleAgeSex', 'nation', year);
    if (!rows) continue;
    for (const [regionKey, label] of [['전국', '전국'], ['부산광역시', '부산']]) {
      const row = rows.get(regionKey);
      if (!row) continue;
      // [0]지역 다음 계 블록(1~13), 남 블록(14~26), 여 블록(27~39)
      for (const [sex, base] of [['남', 1 + BLOCK], ['여', 1 + BLOCK * 2]]) {
        const byBand = Object.fromEntries(BANDS.map((b, i) => [b, num(row[base + 2 + i])]));
        const total = BANDS.reduce((a, b) => a + byBand[b], 0);
        if (!total) continue;
        for (const [band, parts] of Object.entries(WANT)) {
          const households = parts.reduce((a, p) => a + byBand[p], 0);
          out.push([year, label, sex, band, households, round((households / total) * 100)]);
        }
      }
    }
  }
  fs.writeFileSync(
    path.join(OUT, '05_single_household_demo.csv'),
    csv(['year', 'region', 'sex', 'age_band', 'households', 'share_pct'], out)
  );
  return out.length;
}

// ── GeoJSON: 전국 시군구에서 부산 16개만 잘라내고 조인 키를 심는다 ─────────
function buildGeo() {
  const src = JSON.parse(fs.readFileSync(path.join(RAW, 'skorea_municipalities.json'), 'utf8'));
  const features = src.features
    .filter((f) => String(f.properties.code).startsWith('21')) // 21xxx = 부산광역시
    .map((f) => ({
      type: 'Feature',
      properties: {
        sgg_code: String(f.properties.code),
        sgg_name: f.properties.name,
        is_old_downtown: OLD_DOWNTOWN.has(f.properties.name),
      },
      geometry: f.geometry,
    }));
  fs.writeFileSync(path.join(OUT, 'busan_sgg.geojson'), JSON.stringify({ type: 'FeatureCollection', features }));
  return new Map(features.map((f) => [f.properties.sgg_name, f.properties.sgg_code]));
}

// ── 실행 ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const codeByName = buildGeo();
console.log('busan_sgg.geojson       ', codeByName.size, '개 구·군');
console.log('01_trend_national_busan ', build01(), '행');
console.log('02_lonely_death_trend   ', build02(), '행');
console.log('03_busan_districts      ', build03(codeByName), '행');
console.log('04_lonely_death_demo    ', build04(), '행');
console.log('05_single_household_demo', build05(), '행');
