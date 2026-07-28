import { motion, useReducedMotion } from 'framer-motion';
import { CHAPTERS, useDeck } from '@/lib/ChapterDeck';
import { ChapterThumb } from './ChapterThumb';
import { cn } from '@/lib/utils';

/**
 * 챕터 끝에 놓는 '다음 챕터' 카드 — 넷플릭스의 다음 화 카드와 같은 자리.
 *
 * 자동으로 넘어가지는 않는다. 발표 중에 화면이 제멋대로 바뀌면 곤란하고,
 * 학부모가 휴대폰으로 읽을 때도 읽던 문장이 사라지면 안 되기 때문이다.
 * 넘기는 것은 언제나 사람이 정한다.
 *
 * 마지막 챕터에서는 '처음부터 다시 보기'로 바뀐다.
 */
export function UpNext() {
  const { index, goTo } = useDeck();
  const reduced = useReducedMotion();

  const isLast = index === CHAPTERS.length - 1;
  const target = isLast ? CHAPTERS[0] : CHAPTERS[index + 1];
  const targetIndex = isLast ? 0 : index + 1;
  const dark = CHAPTERS[index].tone === 'dark';

  return (
    <motion.button
      type="button"
      onClick={() => goTo(targetIndex)}
      className={cn(
        'group flex w-full max-w-[640px] items-stretch gap-0 overflow-hidden rounded-lg border text-left transition-colors',
        dark ? 'border-slate/50 bg-ink/60 hover:border-lamp/60' : 'border-ink/15 bg-ink/[0.03] hover:border-weakfg/50'
      )}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <span className="hidden w-[168px] shrink-0 sm:block">
        <ChapterThumb id={target.id} tone={target.tone} />
      </span>

      <span className="flex flex-1 flex-col gap-1.5 p-5">
        <span className={cn('text-xs', dark ? 'text-paper/45' : 'text-ink/45')}>
          {isLast ? '처음부터 다시 보기' : '다음 챕터'}
          <span className="num ml-2 opacity-70">{target.num}</span>
        </span>
        <span className={cn('font-serif text-xl leading-snug', dark ? 'text-paper' : 'text-ink')}>{target.title}</span>
        <span className={cn('text-sm leading-relaxed', dark ? 'text-paper/55' : 'text-ink/60')}>{target.blurb}</span>
      </span>

      <span
        className={cn(
          'flex w-14 shrink-0 items-center justify-center text-2xl transition-transform group-hover:translate-x-1',
          dark ? 'text-lamp' : 'text-weakfg'
        )}
        aria-hidden
      >
        {isLast ? '↺' : '→'}
      </span>
    </motion.button>
  );
}
