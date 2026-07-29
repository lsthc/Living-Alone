import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * 챕터 덱 — 이 앱의 화면 전환을 전부 여기서 관리한다.
 *
 * 예전에는 한 장짜리 스크롤 내러티브였다. 발표장에서 두 가지가 계속 문제였다.
 *   ① 손으로 스크롤을 굴리면 그래프가 중간에 걸린 채로 멈춘다.
 *   ② 지금 몇 번째 이야기를 보고 있는지, 앞으로 몇 개가 남았는지 알 수 없다.
 *
 * 그래서 챕터를 넷플릭스의 에피소드처럼 다룬다.
 *   - 한 번에 한 챕터만 화면을 가득 채운다
 *   - 챕터 이동은 오직 ← → · 버튼 · 챕터 목록으로만 한다
 *   - **스크롤로는 절대 챕터가 넘어가지 않는다.** 스크롤은 지금 보는 챕터 안에서만 움직인다
 *     (긴 챕터는 패널이 자기 안에서 스크롤한다. index.css 의 .deck-panel 참고)
 *
 * 발표 모드(P · ?present=1)는 글자를 키우고 장식을 숨기는 표시 설정일 뿐,
 * 이동은 발표 모드가 아니어도 화살표로 된다.
 */

export interface ChapterMeta {
  id: string;
  /** 목록·상단 바에 쓰는 두 자리 번호 */
  num: string;
  /** 좁은 자리에 쓰는 짧은 이름 */
  short: string;
  title: string;
  /** 제목 위에 붙는 한 마디 (가설 번호 등) */
  kicker: string;
  /** 챕터 목록 카드에 쓰는 한 줄 소개 */
  blurb: string;
}

/** 화면에 나오는 순서 그대로. App 의 렌더 순서와 반드시 같아야 한다. */
export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'ch0',
    num: '00',
    short: '창문',
    title: '창문',
    kicker: '프롤로그',
    blurb: '부산의 밤에 켜지는 불빛 중 몇 개가 혼자 켜지는지부터 셉니다.',
  },
  {
    id: 'ch1',
    num: '01',
    short: '더 빠른가',
    title: '부산은 정말 더 빠른가',
    kicker: '가설 H1',
    blurb: '첫 연도를 100으로 놓고 부산과 전국의 속도를 겹쳐 봅니다.',
  },
  {
    id: 'ch2',
    num: '02',
    short: '어디가',
    title: '어디가 가장 외로운가',
    kicker: '가설 H2',
    blurb: '16개 구·군을 하나씩 켜 보고 오래된 동네와의 관계를 확인합니다.',
  },
  {
    id: 'ch3',
    num: '03',
    short: '누가',
    title: '누가 혼자 떠나는가',
    kicker: '가설 H3',
    blurb: '혼자 사는 사람과 혼자 떠나는 사람은 같지 않습니다. 없는 데이터도 그대로 보여줍니다.',
  },
  {
    id: 'ch4',
    num: '04',
    short: '우리 가족',
    title: '우리 가족의 거리',
    kicker: '2막',
    blurb: '도시 전체의 숫자를 여러분이 아는 한 사람의 자리 위에 다시 놓습니다.',
  },
  {
    id: 'ch5',
    num: '05',
    short: '무엇을',
    title: '그래서 지금 무엇을 할 수 있나',
    kicker: '행동',
    blurb: '이미 만들어져 있는 제도와, 지금 바로 걸 수 있는 번호.',
  },
  {
    id: 'ch6',
    num: '06',
    short: '연구 노트',
    title: '연구 노트',
    kicker: '에필로그',
    blurb: '무엇을 어떻게 했고 무엇을 못 했는지 전부 적습니다.',
  },
];

export const chapterIndexOf = (id: string) => CHAPTERS.findIndex((c) => c.id === id);

interface DeckState {
  index: number;
  chapter: ChapterMeta;
  /** 마지막 이동 방향. 화면 전환 애니메이션이 이 값을 본다. 1 = 다음, -1 = 이전 */
  direction: 1 | -1;
  /** 한 번이라도 본 챕터 번호 (챕터 목록에 '본 챕터' 표시를 남긴다) */
  visited: number[];
  goTo: (i: number) => void;
  goToId: (id: string) => void;
  next: () => void;
  prev: () => void;
  browsing: boolean;
  setBrowsing: (v: boolean) => void;
  present: boolean;
  togglePresent: () => void;
}

const DeckContext = createContext<DeckState | null>(null);

/** 입력 중인 칸과 슬라이더에서는 단축키를 가로채지 않는다 */
function isInteractiveTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t || typeof t.closest !== 'function') return false;
  if (t.isContentEditable) return true;
  return !!t.closest('input, select, textarea, [role="slider"], [contenteditable="true"]');
}

export function DeckProvider({ children }: { children: ReactNode }) {
  // 주소의 #ch3 으로 열면 그 챕터에서 시작한다 (발표용 링크를 미리 만들어 둘 수 있게)
  const [index, setIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const i = chapterIndexOf(window.location.hash.replace('#', ''));
    return i >= 0 ? i : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [browsing, setBrowsing] = useState(false);
  const [visited, setVisited] = useState<number[]>(() => [0]);
  const [present, setPresent] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('present') === '1';
  });

  const goTo = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    setIndex((prev) => {
      if (clamped !== prev) setDirection(clamped > prev ? 1 : -1);
      return clamped;
    });
    setVisited((prev) => (prev.includes(clamped) ? prev : [...prev, clamped]));
    setBrowsing(false);
  }, []);

  const goToId = useCallback(
    (id: string) => {
      const i = chapterIndexOf(id);
      if (i >= 0) goTo(i);
    },
    [goTo]
  );

  /**
   * 상대 이동. 화살표를 빠르게 두 번 누르면 두 칸 가야 한다.
   * goTo(index + 1) 로 하면 같은 틱에 들어온 두 번째 입력이 갱신 전 index 를 보고 제자리에 머문다.
   */
  const step = useCallback((delta: 1 | -1) => {
    setIndex((prev) => {
      const nextIndex = Math.max(0, Math.min(CHAPTERS.length - 1, prev + delta));
      if (nextIndex !== prev) {
        setDirection(delta);
        setVisited((v) => (v.includes(nextIndex) ? v : [...v, nextIndex]));
      }
      return nextIndex;
    });
    setBrowsing(false);
  }, []);

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);
  const togglePresent = useCallback(() => setPresent((v) => !v), []);

  // 주소에 현재 챕터와 발표 모드를 남긴다. 새로고침해도 같은 자리에서 다시 열린다.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = CHAPTERS[index].id;
    if (present) url.searchParams.set('present', '1');
    else url.searchParams.delete('present');
    window.history.replaceState(null, '', url);
  }, [index, present]);

  // 발표 모드 — 글자 크기와 body 클래스
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', present ? '1.25' : '1');
    document.body.classList.toggle('present', present);
  }, [present]);

  // 챕터 목록이 열려 있는 동안은 뒤쪽 패널이 스크롤되지 않게 한다.
  // 바텀시트가 쓰는 deck-locked 와 클래스를 나눠 둔다 — 같은 클래스를 쓰면
  // 목록을 닫을 때 열려 있는 시트의 잠금까지 같이 풀린다.
  useEffect(() => {
    document.body.classList.toggle('deck-browsing', browsing);
  }, [browsing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isInteractiveTarget(e.target)) return;

      // 챕터 목록이 열려 있으면 Esc 만 받는다
      if (browsing) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setBrowsing(false);
        }
        return;
      }

      // 바텀시트가 열려 있는 동안은 챕터를 넘기지 않는다.
      // 시트가 body 에 deck-locked 를 걸어 두고, 자기 Esc 는 자기가 처리한다.
      if (document.body.classList.contains('deck-locked')) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          next();
          return;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prev();
          return;
        case 'Home':
          e.preventDefault();
          goTo(0);
          return;
        case 'End':
          e.preventDefault();
          goTo(CHAPTERS.length - 1);
          return;
        case 'Escape':
          if (present) {
            e.preventDefault();
            setPresent(false);
          }
          return;
      }

      // b(ㅠ) 챕터 목록 · p(ㅔ) 발표 모드 · 숫자키로 바로 이동
      if (e.key === 'b' || e.key === 'B' || e.key === 'ㅠ') {
        e.preventDefault();
        setBrowsing(true);
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') {
        e.preventDefault();
        togglePresent();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < CHAPTERS.length) {
          e.preventDefault();
          goTo(i);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [browsing, present, next, prev, goTo, togglePresent]);

  const value = useMemo<DeckState>(
    () => ({
      index,
      chapter: CHAPTERS[index],
      direction,
      visited,
      goTo,
      goToId,
      next,
      prev,
      browsing,
      setBrowsing,
      present,
      togglePresent,
    }),
    [index, direction, visited, goTo, goToId, next, prev, browsing, present, togglePresent]
  );

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

export function useDeck() {
  const ctx = useContext(DeckContext);
  if (!ctx) throw new Error('useDeck 은 DeckProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
