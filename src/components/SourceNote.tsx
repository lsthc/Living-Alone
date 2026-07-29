import { rowsOf, useData } from '@/lib/DataProvider';
import { cn } from '@/lib/utils';

/**
 * 출처 한 줄.
 *
 * ChartFrame 은 차트를 감싸는 틀이라 차트가 없는 자리(Chapter 4 이후의 카드·안내문)에서는 쓸 수 없다.
 * 그래도 '출처 없는 숫자는 화면에 올리지 않는다'는 규칙은 똑같이 지켜야 하므로 이것만 따로 뺐다.
 *
 * 다크 전용 앱이 되면서 `tone` 은 더 이상 배경을 뒤집지 않는다 — 두 값 모두 같은
 * 다크 배경용 스타일로 수렴한다. 다른 파일의 호출부를 건드리지 않기 위해 prop 만 남겨 뒀다.
 */
export function SourceNote({
  sourceIds,
  tone = 'dark',
  className,
}: {
  sourceIds: string[];
  /** 다크 전용이라 dark/light 모두 같은 스타일을 낸다 (호환용으로만 남김) */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const { sources } = useData();
  const all = rowsOf(sources);
  const used = sourceIds.map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);

  const base = tone === 'light' ? 'text-muted' : 'text-muted';
  const link = tone === 'light' ? 'decoration-border hover:text-body' : 'decoration-border hover:text-body';

  return (
    <div className={cn('flex flex-col gap-1 text-xs', base, className)}>
      {used.length === 0 ? (
        <span>출처 정보를 불러오지 못했습니다</span>
      ) : (
        used.map((s) => (
          <span key={s.id}>
            출처 · {s.org}, 「{s.title}」({s.year}){' '}
            <a href={s.url} target="_blank" rel="noreferrer" className={cn('underline underline-offset-2', link)}>
              원자료
            </a>
          </span>
        ))
      )}
    </div>
  );
}
