/**
 * public/data/ 의 실제 데이터로 가설 판정을 돌려 결과를 출력한다.
 * 발표 전에 "지금 데이터로 결론이 무엇인지" 확인하는 용도.
 *
 * 실행: npx vite-node scripts/report_verdicts.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { judgeH1, judgeH2, judgeH3 } from '../src/lib/hypothesis';
import {
  DemoRowSchema,
  DistrictRowSchema,
  LonelyDeathRowSchema,
  TrendRowSchema,
} from '../src/data/schema';
import type { ZodType } from 'zod';

function read<T>(file: string, schema: ZodType<T>): T[] {
  const text = fs.readFileSync(path.resolve('public/data', file), 'utf8').trim();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return parsed.data.map((r, i) => {
    const res = schema.safeParse(r);
    if (!res.success) throw new Error(`${file} ${i + 2}행: ${res.error.issues[0].message}`);
    return res.data;
  });
}

const results = [
  judgeH1(read('01_trend_national_busan.csv', TrendRowSchema), read('02_lonely_death_trend.csv', LonelyDeathRowSchema)),
  judgeH2(read('03_busan_districts.csv', DistrictRowSchema)),
  judgeH3(read('04_lonely_death_demo.csv', DemoRowSchema)),
];

for (const r of results) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`${r.id}  ${r.title}`);
  console.log(`판정   ${r.verdict}`);
  console.log(`근거   ${r.evidence}`);
  console.log(`해석   ${r.interpretation}`);
}
console.log();
