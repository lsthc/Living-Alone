import { motion, useReducedMotion } from 'framer-motion';
import { CHAPTERS, useDeck } from '@/lib/ChapterDeck';
import { cn } from '@/lib/utils';

/**
 * 덱의 고정 UI — 위쪽 바, 좌우 화살표, 아래쪽 진행 막대.
 *
 * 챕터마다 배경색이 다르므로(남색 ↔ 종이색) 이 UI 도 색을 뒤집는다.
 * 발표장 프로젝터에서 흐릿해지지 않도록 대비를 충분히 준다.
 */

/** 지금 챕터 톤에 맞는 색 묶음 */
function useToneClasses() {
  const { chapter } = useDeck();
  const dark = chapter.tone === 'dark';
  return {
    dark,
    bar: dark ? 'bg-ink/85 border-slate/40 text-paper' : 'bg-paper/90 border-ink/12 text-ink',
    dim: dark ? 'text-paper/55' : 'text-ink/55',
    strong: dark ? 'text-paper' : 'text-ink',
    chip: dark
      ? 'border-slate/60 text-paper/60 hover:border-lamp/70 hover:text-lamp'
      : 'border-ink/20 text-ink/65 hover:border-weakfg/60 hover:text-weakfg',
    active: dark ? 'border-lamp/70 bg-lamp/15 text-lamp' : 'border-weakfg/50 bg-weakbg text-weakfg',
    track: dark ? 'bg-paper/15' : 'bg-ink/12',
    fill: dark ? 'bg-lamp' : 'bg-weakfg',
    seen: dark ? 'bg-paper/40' : 'bg-ink/30',
    arrow: dark
      ? 'bg-ink/60 text-paper/60 hover:bg-ink hover:text-lamp'
      : 'bg-paper/70 text-ink/50 hover:bg-paper hover:text-weakfg',
  };
}

/** 위쪽 바 — 제목, 챕터 탭, 목록·발표 모드 버튼 */
export function DeckTopBar() {
  const { index, chapter, goTo, setBrowsing, present, togglePresent } = useDeck();
  const t = useToneClasses();

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b px-4 backdrop-blur transition-colors duration-500 md:px-6',
        t.bar
      )}
    >
      <button
        type="button"
        onClick={() => goTo(0)}
        className={cn('shrink-0 font-serif text-[15px] tracking-tight transition-opacity hover:opacity-70', t.strong)}
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
              'shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors',
              i === index ? t.active : cn('border-transparent', t.dim, 'hover:opacity-100')
            )}
          >
            <span className="num mr-1.5 opacity-60">{c.num}</span>
            {c.short}
          </button>
        ))}
      </nav>

      {/* 좁은 화면에서는 지금 챕터 이름만 */}
      <p className={cn('ml-1 flex-1 truncate text-sm xl:hidden', t.dim)}>
        <span className="num mr-2">{chapter.num}</span>
        {chapter.title}
      </p>

      <button
        type="button"
        onClick={() => setBrowsing(true)}
        className={cn('flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors', t.chip)}
      >
        <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden fill="currentColor">
          <rect x="0" y="0" width="5" height="5" rx="1" />
          <rect x="7" y="0" width="5" height="5" rx="1" />
          <rect x="0" y="7" width="5" height="5" rx="1" />
          <rect x="7" y="7" width="5" height="5" rx="1" />
        </svg>
        챕터 <span className="num hidden sm:inline">B</span>
      </button>

      <button
        type="button"
        onClick={togglePresent}
        aria-pressed={present}
        className={cn(
          'hidden shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors md:block',
          present ? t.active : t.chip
        )}
      >
        발표 모드 <span className="num">P</span>
      </button>
    </header>
  );
}

/** 화면 좌우 끝의 이동 화살표. 스크롤이 아니라 이 버튼(과 ← →)으로만 챕터가 넘어간다. */
export function DeckArrows() {
  const { index, next, prev } = useDeck();
  const t = useToneClasses();
  const last = CHAPTERS.length - 1;

  return (
    <>
      {[
        { dir: -1 as const, on: prev, disabled: index === 0, glyph: '‹', label: '이전 챕터', side: 'left-0' },
        { dir: 1 as const, on: next, disabled: index === last, glyph: '›', label: '다음 챕터', side: 'right-0' },
      ].map((b) => (
        <button
          key={b.dir}
          type="button"
          onClick={b.on}
          disabled={b.disabled}
          aria-label={b.label}
          className={cn(
            'fixed top-1/2 z-40 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-3xl',
            'transition-all duration-300 disabled:pointer-events-none disabled:opacity-0 lg:flex',
            b.side,
            t.arrow
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
  const t = useToneClasses();
  const reduced = useReducedMotion();
  const last = CHAPTERS.length - 1;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex items-center gap-4 border-t px-4 pt-2.5 backdrop-blur transition-colors duration-500 md:px-6',
        // 아이폰 홈 인디케이터에 막대가 가리지 않게 한다
        'pb-[max(0.625rem,env(safe-area-inset-bottom))]',
        t.bar
      )}
    >
      {/* 좁은 화면용 이동 버튼 — 좌우 끝 화살표는 넓은 화면에만 나온다 */}
      <button
        type="button"
        onClick={prev}
        disabled={index === 0}
        aria-label="이전 챕터"
        className={cn('shrink-0 px-1 text-xl transition-opacity disabled:opacity-20 lg:hidden', t.dim)}
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
            <span className={cn('block h-[3px] w-full overflow-hidden rounded-full', t.track)}>
              <motion.span
                className={cn('block h-full rounded-full', i === index ? t.fill : t.seen)}
                initial={false}
                animate={{ width: i === index || visited.includes(i) ? '100%' : '0%' }}
                transition={{ duration: reduced ? 0 : 0.45, ease: 'easeOut' }}
              />
            </span>
          </button>
        ))}
      </div>

      <p className={cn('num shrink-0 text-xs', t.dim)}>
        {index + 1} / {CHAPTERS.length}
      </p>
      <p className={cn('hidden max-w-[30ch] shrink-0 truncate text-xs md:block', t.dim)}>{chapter.title}</p>

      <button
        type="button"
        onClick={next}
        disabled={index === last}
        aria-label="다음 챕터"
        className={cn('shrink-0 px-1 text-xl transition-opacity disabled:opacity-20 lg:hidden', t.dim)}
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
