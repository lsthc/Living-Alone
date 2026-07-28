import { useState } from 'react';
import { useLenis } from '@/lib/SmoothScroll';
import { cn } from '@/lib/utils';

/**
 * 모바일 스토리 내비게이션.
 *
 * 이 앱은 프로젝터 발표(스크롤 내러티브)를 먼저 맞춘 화면이라, 휴대폰으로 처음 여는
 * 학부모에게는 "어디를 눌러야 하는지"가 보이지 않았다. 여기 있는 버튼들은 전부
 * 모바일(md 미만)에서만 나타난다 — 발표장 화면의 흐름은 건드리지 않는다.
 *
 * 버튼 규격은 TDS Mobile xlarge(높이 56px · 반경 16px)를 따른다.
 * welcome.html(학부모 안내 페이지)의 버튼과 같은 규격이라, QR 로 들어온 학부모가
 * 두 페이지를 오가도 같은 손맛이 난다.
 */

/** 챕터 앵커로 부드럽게 이동. Lenis 가 없으면(모바일·모션 감소) 네이티브로 폴백한다. */
function useJump() {
  const lenis = useLenis();
  return (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: reduced ? 0 : 1.1 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
}

/** 챕터 처음(Ch0)에 놓는 큰 유도 버튼. */
export function StoryCta({
  to,
  label,
  sub,
  variant = 'fill',
  className,
}: {
  to: string;
  label: string;
  sub?: string;
  /** fill: 파랑 채움(주 동선) · weak: 어두운 배경 위 약한 강조(보조 동선) */
  variant?: 'fill' | 'weak';
  className?: string;
}) {
  const jump = useJump();
  return (
    <button
      type="button"
      onClick={() => jump(to)}
      className={cn(
        'flex min-h-[56px] w-full flex-col items-center justify-center rounded-lg px-5 py-3 text-center transition-colors',
        variant === 'fill'
          ? 'bg-lamp text-paper active:bg-[#2272eb]'
          : 'border border-slate/60 bg-ink/40 text-paper/80 active:bg-ink/70',
        className
      )}
    >
      <span className="text-[17px] font-semibold leading-6">{label}</span>
      {sub && <span className={cn('mt-0.5 text-sm', variant === 'fill' ? 'text-paper/85' : 'text-paper/55')}>{sub}</span>}
    </button>
  );
}

/**
 * 챕터 끝에 놓는 '다음 이야기' 버튼 — 모바일 전용.
 * 긴 스크롤에서 이야기가 끊기지 않도록, 매 장의 끝에서 다음 장의 질문을 미리 보여준다.
 */
export function NextChapter({
  to,
  label,
  tone = 'dark',
}: {
  to: string;
  /** 다음 챕터의 질문 (예: "어디가 가장 외로운가") */
  label: string;
  /** dark: 심야 남색 배경(Ch0~3) · light: 종이색 배경(Ch4~) */
  tone?: 'dark' | 'light';
}) {
  const jump = useJump();
  return (
    <button
      type="button"
      onClick={() => jump(to)}
      className={cn(
        'flex min-h-[56px] w-full items-center justify-between gap-4 rounded-lg border px-5 transition-colors md:hidden',
        tone === 'dark'
          ? 'border-lamp/40 bg-lamp/10 text-lamp active:bg-lamp/20'
          : 'border-weakfg/30 bg-weakbg/70 text-weakfg active:bg-weakbg'
      )}
    >
      <span className="flex flex-col items-start text-left">
        <span className={cn('text-xs', tone === 'dark' ? 'text-paper/45' : 'text-ink/45')}>다음 이야기</span>
        <span className="text-[16px] font-semibold leading-6">{label}</span>
      </span>
      <span aria-hidden className="text-xl">
        ↓
      </span>
    </button>
  );
}

/**
 * 공유 버튼 — 모바일 전용.
 * 시스템 공유 시트(카카오톡·메시지 등)를 열고, 지원하지 않으면 링크를 복사한다.
 */
export function ShareButton({ tone = 'light' }: { tone?: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // 발표 모드 등 쿼리는 빼고 페이지 주소만 공유한다
    const url = `${location.origin}${location.pathname}`;
    const data = {
      title: '혼자 남겨진 도시, 부산',
      text: '부산에서 혼자 사는 65세 이상 어르신은 18만 명이 넘습니다. 중학교 2학년 네 명이 공공데이터로 확인한 것들.',
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return; // 사용자가 시트를 닫은 것 — 복사로 대신하지 않는다
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        'flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg border text-[16px] font-semibold transition-colors md:hidden',
        tone === 'light'
          ? 'border-ink/20 bg-ink/[0.04] text-ink/80 active:bg-ink/[0.08]'
          : 'border-slate/60 bg-ink/40 text-paper/80 active:bg-ink/70'
      )}
    >
      {copied ? '링크를 복사했습니다' : '이 연구를 가족에게 공유하기'}
    </button>
  );
}
