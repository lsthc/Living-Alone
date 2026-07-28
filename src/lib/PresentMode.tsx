import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLenis } from './SmoothScroll';

/**
 * 발표 모드.
 *
 * 발표장에서 노트북 화살표 키만으로 챕터를 넘길 수 있어야 한다.
 * 스크롤을 손으로 굴리면 그래프가 중간에 걸려 잘린 채로 멈춘다.
 *
 * 켜는 방법 세 가지
 *   ① 주소에 ?present=1 을 붙여서 연다 (발표용 링크를 미리 만들어 두면 안전하다)
 *   ② P 키
 *   ③ 화면 왼쪽 아래 버튼
 *
 * 켜지면
 *   - 글자가 1.25배 커진다 (프로젝터 뒷줄까지)
 *   - ← → 로 챕터를 이동한다 (Home/End 로 처음·끝)
 *   - .present-hide 를 단 장식 요소가 사라진다
 *   - Esc 로 빠져나온다
 */

export interface Chapter {
  id: string;
  label: string;
}

/** 화면에 있는 순서 그대로. App 의 챕터 순서와 반드시 같아야 한다. */
export const CHAPTERS: Chapter[] = [
  { id: 'ch0', label: '창문' },
  { id: 'ch1', label: 'H1 · 부산은 정말 더 빠른가' },
  { id: 'ch2', label: 'H2 · 어디가 가장 외로운가' },
  { id: 'ch3', label: 'H3 · 누가 혼자 떠나는가' },
  { id: 'ch4', label: '우리 가족의 거리' },
  { id: 'ch5', label: '그래서 지금 무엇을 할 수 있나' },
  { id: 'ch6', label: '연구 노트' },
];

interface PresentState {
  present: boolean;
  index: number;
  toggle: () => void;
  goTo: (i: number) => void;
}

const PresentContext = createContext<PresentState>({
  present: false,
  index: 0,
  toggle: () => {},
  goTo: () => {},
});

/** 입력 중인 칸에서는 단축키를 가로채지 않는다 (Ch4 의 선택 상자 등) */
function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t || !t.tagName) return false;
  return /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable;
}

export function PresentModeProvider({ children }: { children: ReactNode }) {
  // ?present=1 로 열면 처음부터 켜진 상태
  const [present, setPresent] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('present') === '1';
  });
  const [index, setIndex] = useState(0);
  const lenis = useLenis();

  const scrollToChapter = useCallback(
    (i: number) => {
      const el = document.getElementById(CHAPTERS[i].id);
      if (!el) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Lenis 가 스크롤을 잡고 있을 때 el.scrollIntoView 를 직접 부르면 Lenis 가 모르는 사이에
      // 위치가 바뀌어 다음 사용자 스크롤이 튄다. lenis.scrollTo 로 같은 경로를 태운다.
      if (lenis) {
        lenis.scrollTo(el, { offset: 0, duration: reduced ? 0 : 1.2 });
      } else {
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
    },
    [lenis]
  );

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, i));
      setIndex(clamped);
      scrollToChapter(clamped);
    },
    [scrollToChapter]
  );

  /**
   * 상대 이동. 화살표를 빠르게 두 번 누르면 두 칸 가야 한다.
   * goTo(index + 1) 로 하면 같은 틱에 들어온 두 번째 입력이 갱신 전 index 를 보고 제자리에 머문다.
   */
  const step = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const next = Math.max(0, Math.min(CHAPTERS.length - 1, prev + delta));
        scrollToChapter(next);
        return next;
      });
    },
    [scrollToChapter]
  );

  const toggle = useCallback(() => setPresent((v) => !v), []);

  // 글자 크기와 body 클래스
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', present ? '1.25' : '1');
    document.body.classList.toggle('present', present);
    // 주소에도 남겨 둔다. 새로고침해도 발표 모드가 유지된다.
    const url = new URL(window.location.href);
    if (present) url.searchParams.set('present', '1');
    else url.searchParams.delete('present');
    window.history.replaceState(null, '', url);
  }, [present]);

  // 발표 모드를 켤 때 지금 보고 있는 챕터에서 시작하도록 위치를 맞춘다
  useEffect(() => {
    if (!present) return;
    const tops = CHAPTERS.map((c) => document.getElementById(c.id)?.getBoundingClientRect().top ?? Infinity);
    // 화면 위쪽에 가장 가까운 챕터
    let best = 0;
    let bestDist = Infinity;
    tops.forEach((t, i) => {
      const d = Math.abs(t);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
  }, [present]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'ㅔ') {
        e.preventDefault();
        toggle();
        return;
      }
      if (!present) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          step(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          step(-1);
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(CHAPTERS.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          setPresent(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present, goTo, step, toggle]);

  const value = useMemo(() => ({ present, index, toggle, goTo }), [present, index, toggle, goTo]);

  return <PresentContext.Provider value={value}>{children}</PresentContext.Provider>;
}

export const usePresentMode = () => useContext(PresentContext);

/**
 * 발표 모드를 켜고 끄는 버튼과, 켜졌을 때의 현재 위치 표시.
 * 발표장 조명 아래에서도 보이도록 대비를 충분히 준다.
 */
export function PresentControls() {
  const { present, index, toggle, goTo } = usePresentMode();
  const current = CHAPTERS[index];

  return (
    <>
      {/* 켜고 끄는 버튼 — 발표 모드에서는 숨는다 */}
      {!present && (
        <button
          type="button"
          onClick={toggle}
          // 발표 모드는 프로젝터·키보드용 기능이라 폰에서는 버튼을 숨긴다
          className="present-hide fixed bottom-5 left-5 z-50 hidden rounded-full border border-slate/60 bg-ink/85 px-4 py-2 text-xs text-paper/60 backdrop-blur transition-colors hover:border-lamp/60 hover:text-lamp md:block"
        >
          발표 모드 <span className="num">P</span>
        </button>
      )}

      {/* 현재 위치 표시 */}
      {present && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate/60 bg-ink/85 px-5 py-2.5 text-sm text-paper/70 backdrop-blur">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="이전 챕터"
            className="text-paper/55 transition-colors hover:text-lamp disabled:opacity-25"
          >
            ←
          </button>
          <span className="num text-paper/55">
            {index + 1} / {CHAPTERS.length}
          </span>
          <span className="max-w-[46ch] truncate">{current.label}</span>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === CHAPTERS.length - 1}
            aria-label="다음 챕터"
            className="text-paper/55 transition-colors hover:text-lamp disabled:opacity-25"
          >
            →
          </button>
          <button
            type="button"
            onClick={toggle}
            className="border-l border-slate/60 pl-4 text-xs text-paper/55 transition-colors hover:text-paper/80"
          >
            나가기 <span className="num">Esc</span>
          </button>
        </div>
      )}

      {/* 스크린리더에게 상태 변화를 알린다 */}
      <p className="sr-only" role="status" aria-live="polite">
        {present ? `발표 모드. ${index + 1}번째 챕터, ${current.label}.` : ''}
      </p>
    </>
  );
}
