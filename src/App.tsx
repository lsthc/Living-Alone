import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DataProvider } from '@/lib/DataProvider';
import { CHAPTERS, DeckProvider, useDeck } from '@/lib/ChapterDeck';
import { ChapterBrowser } from '@/components/deck/ChapterBrowser';
import { DeckArrows, DeckProgress, DeckTopBar } from '@/components/deck/DeckChrome';
import { Ch0Window } from '@/chapters/Ch0_Window';
import { Ch1Faster } from '@/chapters/Ch1_Faster';
import { Ch2Where } from '@/chapters/Ch2_Where';
import { Ch3Who } from '@/chapters/Ch3_Who';
import { Ch4MyFamily } from '@/chapters/Ch4_MyFamily';
import { Ch5WhatNow } from '@/chapters/Ch5_WhatNow';
import { Ch6ResearchNote } from '@/chapters/Ch6_ResearchNote';

/** CHAPTERS 와 같은 순서. 둘이 어긋나면 목록과 화면이 따로 논다. */
const VIEWS = [Ch0Window, Ch1Faster, Ch2Where, Ch3Who, Ch4MyFamily, Ch5WhatNow, Ch6ResearchNote];

/**
 * 한 번에 한 챕터만 화면을 채운다.
 *
 * 패널은 fixed 라서 페이지 자체는 스크롤되지 않는다. 긴 챕터는 패널이 자기 안에서만
 * 스크롤하고, 끝까지 내려도 다음 챕터로 넘어가지 않는다 — 넘기는 것은 ← → · 버튼 ·
 * 챕터 목록뿐이다.
 */
function ChapterStage() {
  const { index, direction } = useDeck();
  const reduced = useReducedMotion();
  const View = VIEWS[index];
  const chapter = CHAPTERS[index];
  const shift = reduced ? 0 : 48;

  return (
    <AnimatePresence initial={false}>
      <motion.main
        key={chapter.id}
        className="deck-panel"
        initial={{ opacity: 0, x: direction * shift, scale: reduced ? 1 : 0.99 }}
        animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] } }}
        exit={{
          opacity: 0,
          x: direction * -shift,
          scale: reduced ? 1 : 0.99,
          transition: { duration: reduced ? 0 : 0.3, ease: 'easeIn' },
        }}
        aria-label={`${chapter.num} ${chapter.title}`}
      >
        <View />
      </motion.main>
    </AnimatePresence>
  );
}

/** 키보드 사용자가 고정 UI 를 지나 지금 챕터의 본문으로 바로 갈 수 있게 */
function SkipLink() {
  const { chapter } = useDeck();
  return (
    <a href={`#${chapter.id}`} className="skip-link">
      본문으로 건너뛰기
    </a>
  );
}

export default function App() {
  return (
    <DeckProvider>
      <DataProvider>
        <SkipLink />

        <DeckTopBar />
        <ChapterStage />
        <DeckArrows />
        <DeckProgress />
        <ChapterBrowser />
      </DataProvider>
    </DeckProvider>
  );
}
