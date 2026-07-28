import { useEffect, useState, type RefObject } from 'react';

/**
 * 요소가 화면에 들어왔는지 판정한다. 한 번 들어오면 계속 true.
 *
 * framer-motion 의 useInView / whileInView 를 그대로 쓰지 않는 이유가 둘 있다.
 *   ① SVG 자식마다 뷰포트 판정을 걸면 교차 계산이 어긋나 일부 요소가 안 나타난다.
 *      그래서 판정은 차트당 한 번, 최상위 <svg> 에서만 한다.
 *   ② IntersectionObserver 가 동작하지 않는 환경에서 화면이 통째로 비어 버린다.
 *      발표장에서 이런 일이 나면 복구할 방법이 없으므로,
 *      스크롤 위치를 직접 재는 폴백을 함께 둔다. 둘 중 하나만 동작해도 화면은 나온다.
 */
export function useReveal(ref: RefObject<Element>, amount = 0.15) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) return;

    // 폴백: 요소가 뷰포트에 amount 만큼 걸쳐 있는지 직접 계산한다
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.height <= 0) return false;
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible / Math.min(r.height, vh) >= amount) {
        setRevealed(true);
        return true;
      }
      return false;
    };

    if (check()) return;

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) setRevealed(true);
        },
        { threshold: Math.min(amount, 0.99) }
      );
      observer.observe(el);
    }

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, amount, revealed]);

  return revealed;
}
