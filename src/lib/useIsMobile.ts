import { useEffect, useState } from 'react';

/** 모바일 판정 기준. Tailwind 의 md 브레이크포인트(768px)와 같은 값을 쓴다. */
const QUERY = '(max-width: 767px)';

/**
 * 모바일(폰) 화면인지 판정하는 훅.
 *
 * 이 앱은 1920×1080 프로젝터를 먼저 맞춘 화면이라, 폰에서는 차트 치수·글자 크기·
 * 여백을 별도 값으로 바꿔 그린다. 판정은 화면 폭 하나로만 한다 —
 * 태블릿 가로(768px 이상)는 데스크톱 레이아웃이 그대로 읽히기 때문이다.
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
