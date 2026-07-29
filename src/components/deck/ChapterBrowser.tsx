import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CHAPTERS, useDeck } from '@/lib/ChapterDeck';
import { ChapterThumb } from './ChapterThumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 챕터 목록 — 넷플릭스의 에피소드 고르기 화면과 같은 역할.
 *
 * B 키나 상단 바의 '챕터' 버튼으로 연다. 카드를 고르면 그 챕터로 바로 넘어간다.
 * 지금 보고 있는 챕터에는 표시가 붙고, 한 번이라도 본 챕터에는 아래 줄이 채워진다.
 * 발표 중에 "2번 가설로 다시 가 주세요" 같은 요청에 한 번에 답하려고 만들었다.
 *
 * 카드는 Lux 의 Card 규격(반경 btn-lg · bg-surface)을 따르되, 목록 안에서 골라야 하므로
 * hover 에서 elevated 로 한 단계 뜨고 지금 보는 카드만 primary 링을 두른다.
 */
export function ChapterBrowser() {
  const { browsing, setBrowsing, index, visited, goTo } = useDeck();
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 지금 보고 있는 카드가 화면 가운데에 오게 한다
  useEffect(() => {
    if (!browsing) return;
    const t = window.setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      currentRef.current?.focus({ preventScroll: true });
    }, 60);
    return () => window.clearTimeout(t);
  }, [browsing]);

  const scrollRail = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 340, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {browsing && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col justify-center bg-bg/92 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="챕터 목록"
        >
          {/* 배경을 누르면 닫힌다 */}
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="챕터 목록 닫기"
            onClick={() => setBrowsing(false)}
          />

          <div className="pointer-events-none relative flex flex-col gap-6 py-10">
            <div className="pointer-events-auto flex items-end justify-between gap-6 px-6 md:px-12">
              <div className="flex flex-col items-start gap-2">
                <Badge tone="primary">CHAPTERS</Badge>
                <h2 className="text-h3 text-foreground md:text-h2">
                  혼자 남겨진 도시, 부산 <span className="num text-muted">· {CHAPTERS.length}개 챕터</span>
                </h2>
              </div>
              <Button variant="weak" color="light" size="medium" onClick={() => setBrowsing(false)}>
                닫기 <span className="num opacity-60">Esc</span>
              </Button>
            </div>

            <div className="relative">
              {/* 좌우 이동 버튼 — 좁은 화면에서는 손가락으로 밀면 되므로 숨긴다 */}
              {[-1, 1].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => scrollRail(dir as 1 | -1)}
                  aria-label={dir === -1 ? '왼쪽으로' : '오른쪽으로'}
                  className={cn(
                    'pointer-events-auto absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full',
                    'bg-surface/85 text-2xl text-muted backdrop-blur transition-colors hover:bg-elevated hover:text-foreground md:flex',
                    dir === -1 ? 'left-3' : 'right-3'
                  )}
                >
                  {dir === -1 ? '‹' : '›'}
                </button>
              ))}

              <div
                ref={railRef}
                className="deck-rail pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 py-3 md:px-12"
              >
                {CHAPTERS.map((c, i) => {
                  const current = i === index;
                  const seen = visited.includes(i);
                  return (
                    <motion.button
                      key={c.id}
                      ref={current ? currentRef : undefined}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={current ? 'true' : undefined}
                      className={cn(
                        'group relative flex w-[248px] shrink-0 snap-start flex-col overflow-hidden rounded-btn-lg bg-surface text-left transition-colors md:w-[300px]',
                        current ? 'ring-2 ring-primary' : 'hover:bg-elevated'
                      )}
                      initial={{ opacity: 0, y: reduced ? 0 : 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : i * 0.04 }}
                      whileHover={reduced ? undefined : { y: -6 }}
                    >
                      <div className="relative aspect-[2/1] w-full overflow-hidden">
                        <ChapterThumb id={c.id} />
                        {current && (
                          <span className="absolute left-3 top-3 rounded-sm bg-primary px-2 py-0.5 text-[12px] font-semibold leading-[18px] text-primary-fg">
                            지금 보는 중
                          </span>
                        )}
                        <span className="num absolute right-3 top-3 text-3xl font-bold text-foreground/20 transition-colors group-hover:text-foreground/40">
                          {c.num}
                        </span>
                      </div>

                      {/* 본 챕터 표시 — 넷플릭스의 시청 진행 막대와 같은 자리 */}
                      <span className="block h-[3px] w-full bg-elevated" aria-hidden>
                        <span
                          className={cn('block h-full', current ? 'bg-primary' : 'bg-muted')}
                          style={{ width: seen ? '100%' : '0%' }}
                        />
                      </span>

                      <span className="flex flex-1 flex-col gap-2 p-4">
                        <span className="num text-[11px] font-semibold tracking-[0.2em] text-weak-fg">{c.kicker}</span>
                        <span className="text-h4 leading-snug text-foreground">{c.title}</span>
                        <span className="text-body-sm text-muted">{c.blurb}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <p className="pointer-events-none px-6 text-body-sm text-muted md:px-12">
              키보드 · <span className="num">←</span> <span className="num">→</span> 챕터 이동 ·{' '}
              <span className="num">1</span>~<span className="num">7</span> 바로 가기 ·{' '}
              <span className="num">B</span> 이 목록 · <span className="num">P</span> 발표 모드
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
