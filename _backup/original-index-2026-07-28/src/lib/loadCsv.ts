import Papa from 'papaparse';
import type { ZodTypeAny, output } from 'zod';

/**
 * public/data/ 의 CSV·JSON 을 읽어 zod 로 검증한다.
 *
 * 파일이 없거나 형식이 깨지면 예외를 던지지 않고 상태로 알린다.
 * 화면은 그 상태를 받아 '데이터 준비 중' 빈 상태를 렌더링한다.
 * 예시 수치를 지어내 채우는 일은 어디에서도 하지 않는다.
 */

export type LoadResult<T> =
  | { status: 'ok'; rows: T[] }
  | { status: 'missing'; message: string } //  파일이 없다
  | { status: 'invalid'; message: string }; // 형식이 스키마와 다르다

/** Vite 의 base 설정('./')을 존중하는 데이터 경로 */
const dataUrl = (file: string) => new URL(`data/${file}`, document.baseURI).href;

export async function loadCsv<S extends ZodTypeAny>(file: string, schema: S): Promise<LoadResult<output<S>>> {
  let text: string;
  try {
    const res = await fetch(dataUrl(file));
    if (!res.ok) return { status: 'missing', message: `${file} 을(를) 찾을 수 없습니다 (HTTP ${res.status})` };
    text = await res.text();
  } catch (e) {
    return { status: 'missing', message: `${file} 을(를) 읽지 못했습니다: ${(e as Error).message}` };
  }

  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const rows: output<S>[] = [];
  for (const [i, raw] of parsed.data.entries()) {
    const result = schema.safeParse(raw);
    if (!result.success) {
      const first = result.error.issues[0];
      return {
        status: 'invalid',
        message: `${file} ${i + 2}행 '${first.path.join('.')}' — ${first.message}`,
      };
    }
    rows.push(result.data);
  }

  if (rows.length === 0) return { status: 'missing', message: `${file} 에 데이터 행이 없습니다` };
  return { status: 'ok', rows };
}

export async function loadJson<S extends ZodTypeAny>(file: string, schema: S): Promise<LoadResult<output<S>>> {
  try {
    const res = await fetch(dataUrl(file));
    if (!res.ok) return { status: 'missing', message: `${file} 을(를) 찾을 수 없습니다 (HTTP ${res.status})` };
    const json = await res.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      const first = result.error.issues[0];
      return { status: 'invalid', message: `${file} '${first.path.join('.')}' — ${first.message}` };
    }
    return { status: 'ok', rows: [result.data] };
  } catch (e) {
    return { status: 'missing', message: `${file} 을(를) 읽지 못했습니다: ${(e as Error).message}` };
  }
}
