import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Children, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLenis } from '@/lib/SmoothScroll';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
 * 원본은 scrub(스크롤 위치에 흐림 정도를 그대로 묶는 방식)을 쓰지만 여기서는 뺐다.
 * 이 문단들은 캡션이 아니라 사람이 멈춰 서서 읽는 본문이다. 문단이 시야에 걸친 채로
 * 스크롤이 멈추면(대부분의 사람이 읽을 때 하는 행동이다) 뒷부분 글자가 계속 흐린 채로
 * 남아 정작 읽어야 할 때 가장 안 읽힌다. 그래서 화면에 들어오면 한 번, 끝까지 재생하고 끝낸다.
 * Lenis 가 켜져 있으면(reduced-motion 이 아니면) 그 스크롤 이벤트에 ScrollTrigger 를 동기화한다.
 */
export function ScrollRevealText({ children, className, baseOpacity = 0.3, blurStrength = 4 }: ScrollRevealTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const lenis = useLenis();
  const segments = useMemo(() => splitChildren(children), [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const words = el.querySelectorAll<HTMLElement>('.reveal-word');
    const tween = gsap.fromTo(
      words,
      { opacity: baseOpacity, filter: `blur(${blurStrength}px)` },
      {
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'power2.out',
        duration: 0.6,
        stagger: 0.03,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [segments, baseOpacity, blurStrength]);

  // Lenis 는 실제 스크롤 위치를 직접 옮기지만, ScrollTrigger 가 한 틱이라도 늦게 알아채면
  // scrub 애니메이션이 살짝 밀려 보인다. 매 Lenis 틱마다 강제로 다시 맞춘다.
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);
    return () => {
      lenis.off('scroll', onScroll);
    };
  }, [lenis]);

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
