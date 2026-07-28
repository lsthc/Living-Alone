import { rowsOf, useData } from '@/lib/DataProvider';
import { cn } from '@/lib/utils';

/**
 * 출처 한 줄.
 *
 * ChartFrame 은 차트를 감싸는 틀이라 차트가 없는 자리(Chapter 4 이후의 카드·안내문)에서는 쓸 수 없다.
 * 그래도 '출처 없는 숫자는 화면에 올리지 않는다'는 규칙은 똑같이 지켜야 하므로 이것만 따로 뺐다.
 *
 * Chapter 4 부터 배경이 종이색으로 바뀌므로 `tone="light"` 로 글자색을 뒤집는다.
 */
export function SourceNote({
  sourceIds,
  tone = 'dark',
  className,
}: {
  sourceIds: string[];
  /** dark = 심야 남색 배경(Ch0~3) · light = 종이색 배경(Ch4~) */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const { sources } = useData();
  const all = rowsOf(sources);
  const used = sourceIds.map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);

  const base = tone === 'light' ? 'text-ink/65' : 'text-paper/55';
  const link = tone === 'light' ? 'decoration-ink/30 hover:text-ink/70' : 'decoration-slate hover:text-paper/70';

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
