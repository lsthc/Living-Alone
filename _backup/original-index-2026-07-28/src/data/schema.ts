import { z } from 'zod';

/**
 * public/data/ 의 CSV 를 검증하는 zod 스키마.
 *
 * 원칙: 값이 비어 있으면 null 로 둔다. 절대 0 이나 임의의 값으로 채우지 않는다.
 * 비어 있는 칸은 화면에서 '데이터 없음'으로 정직하게 표시된다.
 */

/** '1,234' · '' · '12.3' 같은 CSV 문자열을 숫자 또는 null 로 바꾼다. */
const numeric = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(/,/g, '');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  });

/** 비어 있으면 안 되는 숫자 (연도 등) */
const requiredNumber = numeric.pipe(z.number());

const boolish = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : /^(true|1|y|yes)$/i.test(v.trim())));

export const RegionSchema = z.enum(['전국', '부산']);
export type Region = z.infer<typeof RegionSchema>;

export const SexSchema = z.enum(['남', '여']);
export type Sex = z.infer<typeof SexSchema>;

export const AgeBandSchema = z.enum(['40대', '50대', '60대', '70대', '80대이상']);
export type AgeBand = z.infer<typeof AgeBandSchema>;

/** 01 — 전국 vs 부산 독거노인·1인가구 추세 (H1) */
export const TrendRowSchema = z.object({
  year: requiredNumber,
  region: RegionSchema,
  elderly_alone: numeric, // 독거노인 수(명). 2011~2014년은 조사가 없어 null.
  elderly_total: numeric, // 65세 이상 인구(명)
  elderly_alone_rate: numeric, // 65세 이상 중 독거 비율(%)
  single_household_rate: numeric, // 1인세대 비율(%)
});
export type TrendRow = z.infer<typeof TrendRowSchema>;

/** 02 — 고독사 발생 추세 (H1) */
export const LonelyDeathRowSchema = z.object({
  year: requiredNumber,
  region: RegionSchema,
  deaths: numeric,
  per_100k: numeric,
});
export type LonelyDeathRow = z.infer<typeof LonelyDeathRowSchema>;

/** 03 — 부산 16개 구·군 지표 (H2) */
export const DistrictRowSchema = z.object({
  sgg_code: z.string().min(1), // busan_sgg.geojson 의 properties.sgg_code 와 조인
  sgg_name: z.string().min(1),
  year: requiredNumber,
  population: numeric, // 주민등록 총인구. 산점도 점 크기에 쓴다.
  elderly_alone: numeric,
  elderly_alone_rate: numeric,
  aging_rate: numeric,
  single_household_rate: numeric,
  old_housing_rate: numeric, // 1989년 이전 준공 비율. '30년 이상'이 아님에 주의.
  is_old_downtown: boolish,
});
export type DistrictRow = z.infer<typeof DistrictRowSchema>;

/** 04 — 성별·연령대별 고독사 (H3). 부산 교차표는 미공표라 전국만 들어온다. */
export const DemoRowSchema = z.object({
  year: requiredNumber,
  region: RegionSchema,
  sex: SexSchema,
  age_band: AgeBandSchema,
  deaths: numeric,
  share_pct: numeric,
});
export type DemoRow = z.infer<typeof DemoRowSchema>;

/** 05 — 1인세대 성별·연령 구조. 고독사가 아니라 '독거' 통계다. */
export const SingleDemoRowSchema = z.object({
  year: requiredNumber,
  region: RegionSchema,
  sex: SexSchema,
  age_band: AgeBandSchema,
  households: numeric,
  share_pct: numeric,
});
export type SingleDemoRow = z.infer<typeof SingleDemoRowSchema>;

/** sources.json */
export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  org: z.string(),
  year: z.number(),
  url: z.string(),
  license: z.string(),
  note: z.string().optional().default(''),
});
export type Source = z.infer<typeof SourceSchema>;

/** busan_sgg.geojson */
export const GeoFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    sgg_code: z.string(),
    sgg_name: z.string(),
    is_old_downtown: z.boolean().optional().default(false),
  }),
  geometry: z.any(),
});
export const GeoJsonSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoFeatureSchema),
});
export type BusanGeoJson = z.infer<typeof GeoJsonSchema>;
