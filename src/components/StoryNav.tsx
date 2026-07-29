import { useState } from 'react';
import { useDeck } from '@/lib/ChapterDeck';
import { cn } from '@/lib/utils';

/**
 * 챕터 안에 놓는 이동·공유 버튼.
 *
 * 이 앱은 프로젝터 발표를 먼저 맞춘 화면이라, 휴대폰으로 처음 여는 학부모에게는
 * "어디를 눌러야 하는지"가 보이지 않았다. 상단 바와 챕터 목록만으로는 부족해서
 * 본문 안에도 다음 동선을 큰 버튼으로 둔다.
 *
 * 버튼 규격은 TDS Mobile xlarge(높이 56px · 반경 16px)를 따른다.
 * welcome.html(학부모 안내 페이지)의 버튼과 같은 규격이라, QR 로 들어온 학부모가
 * 두 페이지를 오가도 같은 손맛이 난다.
 *
 * 이동은 전부 덱(ChapterDeck)이 처리한다. 스크롤로는 챕터가 넘어가지 않는다.
 */

/** 챕터 하나를 여는 큰 유도 버튼. */
export function StoryCta({
  to,
  label,
  sub,
  variant = 'fill',
  className,
}: {
  /** 챕터 id (예: 'ch4') */
  to: string;
  label: string;
  sub?: string;
  /** fill: 파랑 채움(주 동선) · weak: 어두운 배경 위 약한 강조(보조 동선) */
  variant?: 'fill' | 'weak';
  className?: string;
}) {
  const { goToId } = useDeck();
  return (
    <button
      type="button"
      onClick={() => goToId(to)}
      className={cn(
        'flex min-h-[56px] w-full flex-col items-center justify-center rounded-btn-xl px-5 py-3 text-center transition-colors',
        variant === 'fill'
          ? 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-hover'
          : 'border border-border bg-surface text-body hover:bg-elevated active:bg-elevated',
        className
      )}
    >
      <span className="text-[17px] font-semibold leading-6">{label}</span>
      {sub && <span className={cn('mt-0.5 text-sm', variant === 'fill' ? 'text-primary-fg/85' : 'text-muted')}>{sub}</span>}
    </button>
  );
}

/**
 * 공유 버튼.
 * 시스템 공유 시트(카카오톡·메시지 등)를 열고, 지원하지 않으면 링크를 복사한다.
 *
 * 다크 전용 앱이 되면서 `tone` 은 더 이상 배경을 뒤집지 않는다 — 두 값 모두 같은
 * 다크 배경용 스타일로 수렴한다. 다른 파일의 호출부를 건드리지 않기 위해 prop 만 남겨 뒀다.
 */
export function ShareButton({ tone = 'light' }: { tone?: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // 발표 모드·현재 챕터 같은 내 상태는 빼고 페이지 주소만 공유한다
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
        'flex min-h-[56px] w-full max-w-[420px] items-center justify-center gap-2 rounded-btn-xl border text-[16px] font-semibold transition-colors',
        tone === 'light'
          ? 'border-border bg-surface text-body hover:bg-elevated active:bg-elevated'
          : 'border-border bg-surface text-body hover:bg-elevated active:bg-elevated'
      )}
    >
      {copied ? '링크를 복사했습니다' : '이 연구를 가족에게 공유하기'}
    </button>
  );
}
