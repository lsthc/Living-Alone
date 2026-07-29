import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * 아래에서 올라오는 시트 (Toss 의 바텀시트).
 *
 * 폰에서는 화면 옆에 카드를 놓을 자리가 없다. 지도에서 구를 누르거나 목록에서 항목을
 * 고르면, 보던 화면은 그대로 두고 자세한 내용만 아래에서 올라오게 한다.
 *
 * 규칙 몇 가지
 *   - 손잡이를 아래로 끌면 닫힌다. 배경을 눌러도, Esc 를 눌러도 닫힌다.
 *   - 열려 있는 동안 body 에 deck-locked 를 걸어 뒤쪽 챕터 패널을 얼린다.
 *     같은 클래스를 덱이 보고 있어서, 시트가 열린 동안에는 ← → 로 챕터가 넘어가지 않는다.
 *   - 내용이 길면 시트 안에서만 스크롤한다 (최대 화면의 88%).
 *   - 아이폰 홈 인디케이터에 버튼이 가리지 않도록 safe-area 만큼 더 띄운다.
 *
 * ★ body 로 포털해서 그린다.
 *   챕터 패널(.deck-panel)이 position:fixed + z-index 를 갖고 있어 자기만의 쌓임 맥락을 만든다.
 *   그 안에서 z-index 를 아무리 올려도 패널 바깥의 상단 바·진행 막대(z-50)를 넘지 못해
 *   시트 위로 그것들이 덮여 버린다. 그래서 트리를 벗어나 body 바로 아래에 붙인다.
 */
/**
 * 지금 열려 있는 시트 수.
 *
 * 한 챕터에 시트가 여럿 있고(Ch4 의 선택 칸 세 개), 하나를 닫고 다른 하나를 여는 순간
 * 닫히는 쪽의 정리 코드가 열리는 쪽이 방금 건 잠금을 지워 버린다.
 * 세어 두고 0 이 될 때만 푼다.
 */
let openSheets = 0;

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  /** dark = 심야 남색 챕터(Ch0~3) · light = 종이색 챕터(Ch4~) */
  tone = 'dark',
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tone?: 'dark' | 'light';
  children: ReactNode;
  /** 시트 맨 아래에 고정되는 버튼 자리 (확인 등) */
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const dragControls = useDragControls();
  const dark = tone === 'dark';

  useEffect(() => {
    if (!open) return;
    openSheets += 1;
    document.body.classList.add('deck-locked');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    // 캡처 단계에서 받는다. 덱의 키 처리보다 먼저 Esc 를 가져와야 한다.
    window.addEventListener('keydown', onKey, true);

    return () => {
      openSheets = Math.max(0, openSheets - 1);
      if (openSheets === 0) document.body.classList.remove('deck-locked');
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-bg/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          />

          <motion.div
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[20px] border-t shadow-2xl',
              dark ? 'border-border bg-surface text-foreground' : 'border-border bg-surface text-foreground'
            )}
            initial={{ y: reduced ? 0 : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: reduced ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
            drag={reduced ? false : 'y'}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            {/* 손잡이 — 여기를 잡고 끌어야 닫힌다. 본문을 끌면 그냥 스크롤된다. */}
            <div
              className="shrink-0 cursor-grab touch-none px-5 pb-1 pt-3 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span
                className={cn('mx-auto block h-1 w-10 rounded-full', dark ? 'bg-muted/40' : 'bg-muted/40')}
                aria-hidden
              />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-2">
              <div className="flex flex-col gap-1">
                <h2 className={cn('text-xl leading-snug', dark ? 'text-foreground' : 'text-foreground')}>{title}</h2>
                {subtitle && (
                  <p className={cn('text-sm leading-relaxed', dark ? 'text-muted' : 'text-muted')}>{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl transition-colors',
                  dark ? 'text-muted hover:bg-elevated' : 'text-muted hover:bg-elevated'
                )}
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>

            {footer && (
              <div
                className={cn(
                  'shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3',
                  dark ? 'border-border' : 'border-border'
                )}
              >
                {footer}
              </div>
            )}
            {!footer && <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
