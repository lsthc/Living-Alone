import { Children, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

type Segment = { key: string; text: string } | { key: string; node: ReactNode };

/** 문자열 자식은 띄어쓰기 단위로 쪼개고, <em> 같은 요소 자식은 통째로 한 단어처럼 다룬다 */
function splitChildren(children: ReactNode): Segment[] {
  const out: Segment[] = [];
  let n = 0;
  Children.forEach(children, (child) => {
    if (typeof child === 'string') {
      child.split(/(\s+)/).forEach((piece) => {
        if (piece !== '') out.push({ key: `s${n++}`, text: piece });
      });
    } else if (child !== null && child !== undefined && child !== false) {
      out.push({ key: `n${n++}`, node: child });
    }
  });
  return out;
}

export interface ScrollRevealTextProps {
  children: ReactNode;
  className?: string;
  baseOpacity?: number;
  blurStrength?: number;
}

/**
 * React Bits 의 ScrollReveal 을 이 프로젝트 톤에 맞게 다시 짰다.
 * 원본의 baseRotation(문단이 기울어져 있다가 펴지는 연출)은 뺐다 — 진지한 주제와 안 어울린다.
 *
 * 원본은 GSAP ScrollTrigger 로 문서 스크롤에 물려 재생한다. 이 앱이 챕터 덱이 된 뒤로는
 * 문서가 아예 스크롤되지 않고(챕터 패널이 자기 안에서만 스크롤한다) ScrollTrigger 가
 * 아무 신호도 받지 못한다. 그래서 판정을 IntersectionObserver 로 바꿨다 —
 * 어느 컨테이너가 스크롤하든 '화면에 보이는가'만 보므로 덱에서도 그대로 동작한다.
 *
 * 재생은 화면에 들어올 때 한 번, 끝까지 하고 끝낸다. 스크롤 위치에 흐림 정도를 묶으면
 * 사람이 읽으려고 멈춘 순간 뒷부분이 흐린 채로 남아 정작 읽어야 할 때 안 읽힌다.
 */
export function ScrollRevealText({ children, className, baseOpacity = 0.3, blurStrength = 4 }: ScrollRevealTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const segments = useMemo(() => splitChildren(children), [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const words = el.querySelectorAll<HTMLElement>('.reveal-word');
    if (!words.length) return;

    gsap.set(words, { opacity: baseOpacity, filter: `blur(${blurStrength}px)` });

    let tween: gsap.core.Tween | undefined;
    const play = () => {
      tween = gsap.to(words, {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'power2.out',
        duration: 0.6,
        stagger: 0.03,
      });
    };

    // IntersectionObserver 가 없는 환경에서 문단이 흐린 채로 남으면 발표 중에 복구할 방법이 없다.
    // 그럴 때는 그냥 바로 재생한다 (useReveal 과 같은 원칙).
    if (typeof IntersectionObserver === 'undefined') {
      play();
      return () => tween?.kill();
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      tween?.kill();
    };
  }, [segments, baseOpacity, blurStrength]);

  return (
    <p ref={ref} className={className}>
      {segments.map((seg) =>
        'text' in seg ? (
          /^\s+$/.test(seg.text) ? (
            seg.text
          ) : (
            <span key={seg.key} className="reveal-word" style={{ display: 'inline-block' }}>
              {seg.text}
            </span>
          )
        ) : (
          <span key={seg.key} className="reveal-word" style={{ display: 'inline-block' }}>
            {seg.node}
          </span>
        )
      )}
    </p>
  );
}
