import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * 0 에서 목표 숫자까지 올라가는 카운터.
 * 마지막 구간에서 천천히 멈춘다(easeOut). 숫자는 항상 고정폭.
 */
export function CountUp({
  to,
  duration = 2400,
  delay = 0,
  format = (v: number) => Math.round(v).toLocaleString('ko-KR'),
  className,
}: {
  to: number;
  duration?: number;
  delay?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);
  const frame = useRef<number>();

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      frame.current = requestAnimationFrame(tick);
    }, delay);

    // 안전장치: 탭이 가려지면 requestAnimationFrame 이 멈춰 숫자가 도중에 얼어붙는다.
    // 발표 중 화면을 잠깐 전환해도 최종값은 반드시 보이도록 시간이 지나면 목표값으로 맞춘다.
    const settle = window.setTimeout(() => setValue(to), delay + duration + 400);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [to, duration, delay, reduced]);

  return <span className={className}>{format(value)}</span>;
}
