import { motion, useReducedMotion } from 'framer-motion';
import { CHAPTERS, useDeck } from '@/lib/ChapterDeck';
import { cn } from '@/lib/utils';

/**
 * 덱의 고정 UI — 위쪽 바, 좌우 화살표, 아래쪽 진행 막대.
 *
 * Lux 의 Layout.tsx 헤더와 같은 규격이다. 높이 56px · 아래 테두리 1px ·
 * 배경은 캔버스 90% 에 backdrop-blur. 다크 전용이라 챕터마다 색을 뒤집던
 * 예전 로직은 없앴다 — 상단 바는 처음부터 끝까지 같은 모습이다.
 */

/** 위쪽 바 — 제목, 챕터 탭, 목록·발표 모드 버튼 */
export function DeckTopBar() {
  const { index, chapter, goTo, setBrowsing, present, togglePresent } = useDeck();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={() => goTo(0)}
        className="shrink-0 text-[17px] font-bold leading-6 tracking-tight text-foreground transition-opacity hover:opacity-70"
      >
        혼자 남겨진 도시, 부산
      </button>

      {/* 챕터 탭 — 넓은 화면에서만. 좁은 화면은 아래 '챕터' 버튼으로 연다. */}
      <nav aria-label="챕터" className="ml-2 hidden flex-1 items-center gap-1 overflow-hidden xl:flex">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === index ? 'true' : undefined}
            className={cn(
              'shrink-0 rounded-btn px-3 py-1.5 text-[13px] font-medium transition-colors',
              i === index ? 'bg-weak-bg text-weak-fg' : 'text-muted hover:bg-surface hover:text-body'
            )}
          >
            <span className="num mr-1.5 opacity-60">{c.num}</span>
            {c.short}
          </button>
        ))}
      </nav>

      {/* 좁은 화면에서는 지금 챕터 이름만 */}
      <p className="ml-1 flex-1 truncate text-body-sm text-muted xl:hidden">
        <span className="num mr-2">{chapter.num}</span>
        {chapter.title}
      </p>

      <button
        type="button"
        onClick={() => setBrowsing(true)}
        className="flex h-8 shrink-0 items-center gap-2 rounded-btn bg-surface px-3 text-[13px] font-semibold text-body transition-colors hover:bg-elevated active:opacity-80"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden fill="currentColor">
          <rect x="0" y="0" width="5" height="5" rx="1" />
          <rect x="7" y="0" width="5" height="5" rx="1" />
          <rect x="0" y="7" width="5" height="5" rx="1" />
          <rect x="7" y="7" width="5" height="5" rx="1" />
        </svg>
        챕터 <span className="num hidden opacity-60 sm:inline">B</span>
      </button>

      <button
        type="button"
        onClick={togglePresent}
        aria-pressed={present}
        className={cn(
          'hidden h-8 shrink-0 items-center rounded-btn px-3 text-[13px] font-semibold transition-colors active:opacity-80 md:flex',
          present ? 'bg-weak-bg text-weak-fg' : 'bg-surface text-body hover:bg-elevated'
        )}
      >
        발표 모드 <span className="num ml-1.5 opacity-60">P</span>
      </button>
    </header>
  );
}

/** 화면 좌우 끝의 이동 화살표. 스크롤이 아니라 이 버튼(과 ← →)으로만 챕터가 넘어간다. */
export function DeckArrows() {
  const { index, next, prev } = useDeck();
  const last = CHAPTERS.length - 1;

  return (
    <>
      {[
        { dir: -1 as const, on: prev, disabled: index === 0, glyph: '‹', label: '이전 챕터', side: 'left-3' },
        { dir: 1 as const, on: next, disabled: index === last, glyph: '›', label: '다음 챕터', side: 'right-3' },
      ].map((b) => (
        <button
          key={b.dir}
          type="button"
          onClick={b.on}
          disabled={b.disabled}
          aria-label={b.label}
          className={cn(
            'fixed top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full',
            'bg-surface/80 text-2xl text-muted backdrop-blur transition-all duration-200',
            'hover:bg-elevated hover:text-foreground active:opacity-80',
            'disabled:pointer-events-none disabled:opacity-0 lg:flex',
            b.side
          )}
        >
          {b.glyph}
        </button>
      ))}
    </>
  );
}

/** 아래쪽 진행 막대 — 지금 몇 번째 챕터인지, 어디까지 봤는지 */
export function DeckProgress() {
  const { index, visited, goTo, chapter, next, prev } = useDeck();
  const reduced = useReducedMotion();
  const last = CHAPTERS.length - 1;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex items-center gap-4 border-t border-border bg-bg/90 px-4 pt-2.5 backdrop-blur md:px-6',
        // 아이폰 홈 인디케이터에 막대가 가리지 않게 한다
        'pb-[max(0.625rem,env(safe-area-inset-bottom))]'
      )}
    >
      {/* 좁은 화면용 이동 버튼 — 좌우 끝 화살표는 넓은 화면에만 나온다 */}
      <button
        type="button"
        onClick={prev}
        disabled={index === 0}
        aria-label="이전 챕터"
        className="shrink-0 px-1 text-xl text-muted transition-opacity disabled:opacity-20 lg:hidden"
      >
        ‹
      </button>

      <div className="flex flex-1 items-center gap-1.5">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${c.num} ${c.title}로 이동`}
            aria-current={i === index ? 'true' : undefined}
            className="group relative flex-1 py-2"
          >
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-elevated">
              <motion.span
                className={cn('block h-full rounded-full', i === index ? 'bg-primary' : 'bg-muted')}
                initial={false}
                animate={{ width: i === index || visited.includes(i) ? '100%' : '0%' }}
                transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
              />
            </span>
          </button>
        ))}
      </div>

      <p className="num shrink-0 text-body-sm text-muted">
        {index + 1} / {CHAPTERS.length}
      </p>
      <p className="hidden max-w-[30ch] shrink-0 truncate text-body-sm text-muted md:block">{chapter.title}</p>

      <button
        type="button"
        onClick={next}
        disabled={index === last}
        aria-label="다음 챕터"
        className="shrink-0 px-1 text-xl text-muted transition-opacity disabled:opacity-20 lg:hidden"
      >
        ›
      </button>

      {/* 스크린리더에게 챕터 이동을 알린다 */}
      <p className="sr-only" role="status" aria-live="polite">
        {`${index + 1}번째 챕터, ${chapter.title}.`}
      </p>
    </div>
  );
}
