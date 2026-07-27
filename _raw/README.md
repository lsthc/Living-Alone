# _raw — 수집 시점의 원자료 스냅샷

여기 있는 파일은 **우리가 손대지 않은 원본 그대로**다. 가공은 전부 `scripts/build_csv.mjs` 가
`public/data/*.csv` 로 옮기면서 한다. 원본을 남겨 두는 이유는 하나다 —
**누구든 같은 데이터로 같은 결과를 다시 만들 수 있어야 하기 때문이다.**

수집일: 2026-07-25

| 경로 | 내용 | 출처 |
|---|---|---|
| `mois/age_{nation\|busan}_{2010~2024}.csv` | 연령별 인구현황 (EUC-KR) | 행정안전부 주민등록 인구통계 |
| `mois/households_*.csv` | 지역별 세대원수별 세대수 | 〃 |
| `mois/singleAge_*.csv`, `singleAgeSex_*.csv` | 단독세대(1인세대) 성·연령별 세대수 | 〃 |
| `kosis/elderly_alone.json` | 독거노인가구비율 — 65세 이상 1인가구 | 국가데이터처(통계청) 인구총조사 `DT_1YL12701` |
| `kosis/old_housing.json` | 건축연도별 주택 — 시군구 | 국가데이터처(통계청) 주택총조사 `DT_1JU1520` |
| `skorea_municipalities.json` | 시군구 경계 GeoJSON | 통계청 센서스용 행정구역경계(2013) |
| `1483372_3.bin` | hwpx 원문 | 보건복지부 「2024년도 고독사 사망자 실태조사 결과」(2024) |
| `2024_고독사_실태조사.hwpx` / `.pdf` | 같은 보도자료의 배포본 | 〃 |
| `1488039_1.bin` | hwpx 원문 | 보건복지부 「2024년 고독사 발생 현황」(2025) |
| `1488039_2.bin` | 같은 보도자료의 PDF | 〃 |

`.bin` 은 기관 사이트가 확장자 없이 내려 주는 파일을 받은 그대로 둔 것이다.
앞 4바이트가 `PK` 면 hwpx(zip), `%PDF` 면 PDF 다. 이름을 바꾸지 않은 것은
`fetch` 스크립트가 받은 상태를 그대로 보존하기 위해서다.

## 다시 만드는 법

```bash
npm run data:fetch   # 행안부 CSV + KOSIS OpenAPI → _raw/  (.env 의 KOSIS_API_KEY 필요)
npm run data:build   # _raw/ → public/data/*.csv, *.geojson
```

보건복지부 고독사 수치만 OpenAPI 가 없어, 위 보도자료 원문의 표를 사람이 직접 옮겨 적어
`scripts/build_csv.mjs` 상단 상수(`LONELY_DEATH`, `DEMO_NATIONAL`)에 넣었다.
그 값을 고치려면 원문을 다시 열어 대조한 뒤 상수를 고쳐야 한다.

## 여기 없는 것

탐색용으로 받아 봤다가 쓰지 않은 파일(`*probe*`, `*.html`)과 보도자료 압축을 풀어 본
이미지 폴더(`hwpx/`, `hwpx24/`)는 저장소에 올리지 않는다. 분석에 쓰이지 않고 용량만 차지한다.
