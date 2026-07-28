import { cn } from '@/lib/utils';
import type { LoadResult } from '@/lib/loadCsv';

/**
 * 데이터가 없거나 형식이 깨졌을 때 그 자리에 대신 그리는 상태.
 * 예시 수치를 지어내 채우는 대신 비어 있다는 사실을 그대로 보여준다.
 */
export function EmptyState({
  title = '데이터 준비 중',
  detail,
  className,
}: {
  title?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate/60 p-8 text-center',
        className
      )}
    >
      {/* 꺼진 창문. 이 앱의 격자 모티프를 빈 상태에도 그대로 쓴다. */}
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="block h-2.5 w-2.5 bg-slate/40" />
        ))}
      </div>
      <p className="font-serif text-lg text-paper/80">{title}</p>
      {detail && <p className="max-w-md text-sm text-paper/55">{detail}</p>}
    </div>
  );
}

/** LoadResult 를 받아 실패했으면 EmptyState 를, 성공했으면 children 을 그린다. */
export function WithData<T>({
  result,
  children,
  emptyTitle,
}: {
  result: LoadResult<T> | null;
  children: (rows: T[]) => React.ReactNode;
  emptyTitle?: string;
}) {
  if (!result) return <EmptyState title="불러오는 중" />;
  if (result.status !== 'ok') {
    return (
      <EmptyState
        title={emptyTitle ?? '데이터 준비 중'}
        detail={result.status === 'invalid' ? `형식이 맞지 않습니다 — ${result.message}` : result.message}
      />
    );
  }
  return <>{children(result.rows)}</>;
}
