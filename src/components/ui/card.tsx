import { cn } from '@/lib/utils';

/**
 * Lux(apps/web/src/components/ui/card.tsx)에서 가져온 카드.
 *
 * 다크 전용이라 그림자로 층을 만들지 않는다. bg-surface(카드) 위에
 * bg-elevated(카드 안의 강조 블록)를 얹는 '평면 색상 레이어링'으로 깊이를 낸다.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-btn-lg bg-surface p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-h4 text-foreground', className)} {...props} />;
}

/** 평면 색상 레이어링 구분선 */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} />;
}
