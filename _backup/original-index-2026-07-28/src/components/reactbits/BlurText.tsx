import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useMemo } from 'react';

export interface BlurTextProps {
  text: string;
  className?: string;
  /** 'words' | 'chars' — 짧은 한글 문구는 words 로 충분하다 */
  animateBy?: 'words' | 'chars';
  delayStep?: number;
}

/**
 * React Bits 의 BlurText 를 이 프로젝트 스택(framer-motion, 이미 설치돼 있다)에 맞게 옮겼다.
 * 원본은 motion/react 를 쓰지만 API 가 framer-motion 과 같아 새 의존성 없이 그대로 이식된다.
 * 흐릿하게 시작해 스크롤로 들어오면 또렷해진다. reduced-motion 이면 즉시 또렷하게 보여준다.
 * 인라인 span 이므로 부모 쪽에서 h1·p 등 원하는 태그로 감싸 쓴다.
 */
export function BlurText({ text, className, animateBy = 'words', delayStep = 0.06 }: BlurTextProps) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () => (animateBy === 'words' ? text.split(/(\s+)/) : text.split('')),
    [text, animateBy]
  );

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : delayStep } },
  };
  const item: Variants = {
    hidden: reduced ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: -14 },
    show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: reduced ? 0 : 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
    >
      {pieces.map((piece, i) =>
        /^\s+$/.test(piece) ? (
          piece
        ) : (
          <motion.span key={i} variants={item} style={{ display: 'inline-block' }}>
            {piece}
          </motion.span>
        )
      )}
    </motion.span>
  );
}
