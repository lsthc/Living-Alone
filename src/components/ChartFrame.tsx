import type { ReactNode } from 'react';
import { rowsOf, useData } from '@/lib/DataProvider';
import { cn } from '@/lib/utils';

/**
 * 모든 차트를 감싸는 틀.
 *
 * 규칙 세 가지를 여기서 강제한다.
 *   ① 출처를 반드시 표기한다 (sources.json 에서 읽어온다)
 *   ② 차트에 aria-label 을 단다
 *   ③ 그림을 못 보는 사람을 위한 텍스트 대체 요약을 함께 둔다
 */
export function ChartFrame({
  title,
  subtitle,
  /** 화면에 보이지 않지만 스크린리더가 읽는 요약. 차트가 말하는 내용을 문장으로. */
  summary,
  sourceIds,
  /** 데이터의 정의상 한계 등 독자가 알아야 할 주의사항 */
  caveat,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  summary: string;
  sourceIds: string[];
  caveat?: string;
  children: ReactNode;
  className?: string;
}) {
  const { sources } = useData();
  const all = rowsOf(sources);
  const used = sourceIds.map((id) => all.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <figure className={cn('flex flex-col gap-4', className)}>
      <figcaption className="flex flex-col gap-1">
        <h3 className="text-headline text-foreground">{title}</h3>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </figcaption>

      <div role="group" aria-label={title}>
        {children}
        {/* 텍스트 대체 요약 — 화면에는 보이지 않지만 스크린리더는 읽는다 */}
        <p className="sr-only">{summary}</p>
      </div>

      {caveat && (
        <p className="border-l-2 border-border pl-3 text-sm leading-relaxed text-muted">
          <span className="text-body">읽을 때 주의</span> — {caveat}
        </p>
      )}

      <div className="flex flex-col gap-1 text-xs text-muted">
        {used.length === 0 ? (
          <span>출처 정보를 불러오지 못했습니다</span>
        ) : (
          used.map((s) => (
            <span key={s.id}>
              출처 · {s.org}, 「{s.title}」({s.year}){' '}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-border underline-offset-2 hover:text-body"
              >
                원자료
              </a>
            </span>
          ))
        )}
      </div>
    </figure>
  );
}
