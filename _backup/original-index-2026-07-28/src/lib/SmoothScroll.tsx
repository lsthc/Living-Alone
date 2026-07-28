import Lenis from 'lenis';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const LenisContext = createContext<Lenis | null>(null);

/**
 * Lenis 스무스 스크롤.
 *
 * 모션을 줄이도록 설정한 사용자에게는 아예 만들지 않는다 — 네이티브 스크롤 그대로 둔다.
 * 이 프로젝트의 다른 애니메이션(WindowGrid, CountUp 등)과 같은 원칙이다.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const instance = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    setLenis(instance);

    let raf = 0;
    const loop = (time: number) => {
      instance.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

/** 없으면(모션 감소 설정) null — 호출부는 네이티브 스크롤로 폴백해야 한다 */
export const useLenis = () => useContext(LenisContext);
