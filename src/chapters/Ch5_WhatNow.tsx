import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { UpNext } from '@/components/deck/UpNext';
import { ShareButton } from '@/components/StoryNav';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SwipeDeck } from '@/components/ui/SwipeDeck';
import { HOTLINES, NEIGHBOR_ACTIONS, PROGRAMS, type Program } from '@/data/programs';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn } from '@/lib/utils';

/** 공식 사이트에서 확인한 날짜를 사람이 읽는 형태로 */
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
};

function ProgramCard({ program, highlighted }: { program: Program; highlighted?: boolean }) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      id={`program-${program.id}`}
      className={cn(
        'flex scroll-mt-24 flex-col gap-5 rounded-btn-lg border p-6 transition-colors md:p-8',
        highlighted ? 'border-weak-fg/50 bg-weak-bg/50' : 'border-border bg-surface'
      )}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <header className="flex flex-col gap-1.5">
        <span className="text-xs tracking-wide text-muted">{program.org}</span>
        <h3 className="text-2xl text-foreground">{program.name}</h3>
      </header>

      {/*
       * 세 개의 부제(무엇을·누구에게·어떻게)가 이 카드의 뼈대다.
       * 예전에는 본문과 같은 크기의 흐린 회색이라 글 덩어리로만 보였다.
       * 파란 세로선 + 굵은 라벨로 세워 두면, 훑기만 해도 "나한테 해당되나"(누구에게)와
       * "그럼 어디로 가나"(어떻게)를 바로 집어낼 수 있다.
       */}
      <dl className="flex flex-col gap-5">
        {[
          { k: '무엇을', v: program.what },
          { k: '누구에게', v: program.who },
          { k: '어떻게', v: program.how },
        ].map((row) => (
          <div key={row.k} className="flex flex-col gap-1.5 border-l-[3px] border-weak-fg/45 pl-4">
            <dt className="text-[13px] font-bold tracking-[0.08em] text-weak-fg">{row.k}</dt>
            <dd className="text-[15px] leading-relaxed text-foreground">{row.v}</dd>
          </div>
        ))}
      </dl>

      {program.highlight && (
        <p className="rounded-md border-l-2 border-primary bg-weak-bg/60 px-4 py-3 text-sm leading-relaxed text-foreground">
          {program.highlight}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted">
        {program.cost && <span className="text-muted">{program.cost}</span>}
        <a
          href={program.url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border underline-offset-2 hover:text-body"
        >
          {program.urlLabel}
        </a>
        <span className="num">{fmtDate(program.verifiedOn)} 확인</span>
      </div>
    </motion.article>
  );
}

/**
 * Chapter 5 — 그래서 지금 무엇을 할 수 있나
 *
 * 앞의 네 장이 문제였다면 이 장은 이미 만들어져 있는 답이다.
 *
 * ★ 이 챕터의 규칙: 공식 사이트에서 직접 확인한 것만 적는다.
 *   확인하지 못한 전화번호와 구·군별 사업은 넣지 않았고, 무엇을 왜 뺐는지도 화면에 적었다.
 *   발표에서 "이건 어디서 확인했나요"라는 질문에 링크로 답할 수 있어야 한다.
 *   근거 목록은 `src/data/programs.ts` 에 있다.
 */
export function Ch5WhatNow() {
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const [checked, setChecked] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /**
   * 어떤 제도가 해당될 수 있는지 세 가지만 물어 좁혀 준다.
   *
   * ★ 규칙: 판정하지 않는다. 위 PROGRAMS 의 `who`(공식 사이트에서 확인한 신청 자격)를
   *   그대로 대조해 '해당될 수 있다'까지만 말하고, 마지막 확인은 129·주민센터로 보낸다.
   *   실제 수급 여부는 소득·재산 조사를 거쳐야 정해지는데 그 자료가 우리에게 없다.
   */
  const [alone, setAlone] = useState<boolean | null>(null);
  const [senior, setSenior] = useState<boolean | null>(null);
  const [income, setIncome] = useState<'yes' | 'no' | 'unknown' | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const answered = alone !== null && senior !== null && income !== null;

  /** 폰에서 열리는 항목 시트 (이웃이 할 수 있는 일) */
  const [openAction, setOpenAction] = useState<string | null>(null);
  const action = NEIGHBOR_ACTIONS.find((a) => a.id === openAction) ?? null;

  /** 세 개의 질문. 넓은 화면에서는 카드 안에, 폰에서는 시트 안에 같은 것이 들어간다. */
  const questionRows = (
    <div className="flex flex-col gap-5 py-1">
      {[
        {
          q: '혼자 사시나요',
          options: [
            { label: '네', on: alone === true, pick: () => setAlone(true) },
            { label: '아니요', on: alone === false, pick: () => setAlone(false) },
          ],
        },
        {
          q: '65세 이상이신가요',
          options: [
            { label: '네', on: senior === true, pick: () => setSenior(true) },
            { label: '아니요', on: senior === false, pick: () => setSenior(false) },
          ],
        },
        {
          q: '기초연금이나 기초생활수급을 받고 계신가요',
          options: [
            { label: '네', on: income === 'yes', pick: () => setIncome('yes') },
            { label: '아니요', on: income === 'no', pick: () => setIncome('no') },
            { label: '모르겠어요', on: income === 'unknown', pick: () => setIncome('unknown') },
          ],
        },
      ].map((row) => (
        <div key={row.q} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-[14rem] flex-1 text-sm text-body">{row.q}</p>
          <div className="flex gap-2">
            {row.options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={o.pick}
                aria-pressed={o.on}
                className={cn(
                  'min-h-[44px] rounded-full border px-4 text-sm transition-colors focus-visible:ring-primary focus-visible:ring-offset-bg',
                  o.on
                    ? 'border-weak-fg/50 bg-weak-bg text-weak-fg'
                    : 'border-border text-muted hover:border-muted hover:text-foreground'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const matches = useMemo(() => {
    if (!answered) return [];
    const out: { id: string; name: string; why: string; sure: boolean }[] = [];
    // 응급안전안심서비스 — 2024년부터 독거노인은 소득 기준이 없다
    if (alone && senior) {
      out.push({
        id: 'emergency',
        name: '독거노인·장애인 응급안전안심서비스',
        why: '혼자 사시는 65세 이상이면 소득과 관계없이 신청할 수 있습니다 (2024년 소득기준 폐지).',
        sure: true,
      });
    }
    // 노인맞춤돌봄서비스 — 65세 이상 + 수급·차상위·기초연금
    if (senior && income !== 'no') {
      out.push({
        id: 'care',
        name: '노인맞춤돌봄서비스',
        why:
          income === 'yes'
            ? '65세 이상이면서 기초연금·수급 대상이고 돌봄이 필요하면 신청 대상입니다.'
            : '65세 이상이고 기초연금·수급 여부에 따라 대상이 될 수 있습니다. 129에 물어보면 확인해 줍니다.',
        sure: income === 'yes',
      });
    }
    return out;
  }, [answered, alone, senior, income]);

  const matchedIds = matches.map((m) => m.id);

  const copyChecklist = async () => {
    const picked = NEIGHBOR_ACTIONS.filter((a) => checked.includes(a.id));
    if (!picked.length) return;
    const text = [
      '내가 하기로 한 것 — 혼자 남겨진 도시, 부산',
      ...picked.map((a, i) => `${i + 1}. ${a.text}\n   근거: ${a.basis}`),
      '',
      '제도는 바뀝니다. 신청 전에 129나 주민센터에서 한 번 더 확인하세요.',
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  /** 문답 결과에서 제도 카드로 데려간다. 주소를 건드리지 않으려고 앵커 대신 직접 옮긴다. */
  const jumpToProgram = (id: string) => {
    document.getElementById(`program-${id}`)?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
  };

  return (
    <div className="w-full text-foreground">
      <section id="ch5" className="chapter flex flex-col gap-10 md:gap-14" aria-labelledby="ch5-heading">
        <header className="flex max-w-[70ch] flex-col gap-4">
          <span className="num text-xs tracking-[0.25em] text-weak-fg">CHAPTER 5</span>
          <h2 id="ch5-heading" className="text-headline text-foreground">
            <BlurText text="그래서 지금 무엇을 할 수 있나" />
          </h2>
          <ScrollRevealText className="leading-relaxed text-body">
            여기까지 오면 대개 이런 말로 끝납니다. "관심을 가집시다." 저희는 그 말이 아무것도 바꾸지 않는다고
            생각했습니다. 그래서 이미 만들어져 있는 제도를 찾아봤습니다. 아래 내용은 전부 각 기관 공식
            사이트에서 직접 확인한 것이고, 확인하지 못한 것은 넣지 않았습니다.
          </ScrollRevealText>
        </header>

        {/* 세 가지만 물어 제도를 좁혀 준다 */}
        <div className="flex max-w-[74ch] flex-col gap-6 rounded-btn-lg border border-border bg-surface p-6 md:p-8">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-2xl text-foreground">어떤 제도가 해당될까요</h3>
            <p className="text-sm leading-relaxed text-body">
              떠올린 그분에 대해 세 가지만 골라 주세요. 아래 두 제도의 공식 신청 자격과 대조해 보여 드립니다.
              고른 값은 이 브라우저 밖으로 나가지 않습니다.
            </p>
          </div>

          {/* 넓은 화면 — 카드 안에서 바로 고른다 */}
          {!mobile && questionRows}

          {/* 폰 — 아래에서 올라오는 시트에서 고른다 */}
          {mobile && (
            <>
              <button
                type="button"
                onClick={() => setFinderOpen(true)}
                className={cn(
                  'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-btn-lg border px-4 text-left transition-colors',
                  answered ? 'border-weak-fg/45 bg-weak-bg/50 text-foreground' : 'border-border bg-elevated text-muted'
                )}
              >
                <span className="text-base">
                  {answered
                    ? `${alone ? '혼자 사심' : '함께 사심'} · ${senior ? '65세 이상' : '65세 미만'} · 기초연금 ${
                        income === 'yes' ? '받음' : income === 'no' ? '안 받음' : '모름'
                      }`
                    : '세 가지 고르기'}
                </span>
                <span className="shrink-0 text-muted" aria-hidden>
                  ⌄
                </span>
              </button>

              <BottomSheet
                open={finderOpen}
                onClose={() => setFinderOpen(false)}
                tone="dark"
                title="어떤 제도가 해당될까요"
                subtitle="세 가지만 고르면 공식 신청 자격과 대조해 드립니다"
                footer={
                  <button
                    type="button"
                    onClick={() => setFinderOpen(false)}
                    disabled={!answered}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-btn-xl bg-primary text-[17px] font-semibold text-primary-fg transition-colors active:bg-primary-hover disabled:bg-elevated disabled:text-muted"
                  >
                    {answered ? '결과 보기' : '세 가지를 모두 골라 주세요'}
                  </button>
                }
              >
                {questionRows}
              </BottomSheet>
            </>
          )}

          <AnimatePresence mode="wait">
            {answered && (
              <motion.div
                key={`${alone}-${senior}-${income}`}
                className="flex flex-col gap-3 border-t border-border pt-5"
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                role="status"
                aria-live="polite"
              >
                {matches.length === 0 ? (
                  <p className="text-sm leading-relaxed text-body">
                    이 화면에 실린 두 제도는 모두 65세 이상을 대상으로 합니다. 해당되는 것이 없더라도 다른 복지
                    제도가 있을 수 있으니 <span className="num text-foreground">129</span> 에 물어보시는 편이 정확합니다.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted">해당될 수 있는 제도 {matches.length}개</p>
                    <ul className="flex flex-col gap-3">
                      {matches.map((m) => (
                        <li key={m.id} className="flex flex-col gap-1.5 border-l-2 border-weak-fg/50 pl-4">
                          <button
                            type="button"
                            onClick={() => jumpToProgram(m.id)}
                            className="text-left text-lg text-foreground underline decoration-border underline-offset-4 hover:decoration-muted"
                          >
                            {m.name}
                            {!m.sure && <span className="ml-2 align-middle text-xs text-muted">확인 필요</span>}
                          </button>
                          <p className="text-sm leading-relaxed text-body">{m.why}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="text-xs leading-relaxed text-muted">
                  이건 신청 결과가 아니라 공식 자격 요건과의 대조입니다. 실제 대상 여부는 소득·재산 조사를 거쳐
                  정해지므로, 마지막 확인은 <span className="num">129</span> 나 주민센터에서 해 주세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAlone(null);
                    setSenior(null);
                    setIncome(null);
                  }}
                  className="self-start rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-muted hover:text-foreground focus-visible:ring-primary focus-visible:ring-offset-bg"
                >
                  다시 고르기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 제도 카드 — 폰에서는 옆으로 밀어 넘긴다 */}
        <SwipeDeck
          labels={PROGRAMS.map((p) => p.name)}
          tone="dark"
          desktopClassName="grid gap-6 lg:grid-cols-2"
        >
          {PROGRAMS.map((p) => (
            <ProgramCard key={p.id} program={p} highlighted={matchedIds.includes(p.id)} />
          ))}
        </SwipeDeck>

        {/* 지금 바로 걸 수 있는 번호 */}
        <div className="flex flex-col gap-5">
          <h3 className="text-2xl text-foreground">지금 바로 걸 수 있는 번호</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {HOTLINES.map((h) => (
              <motion.div
                key={h.id}
                className="flex items-start gap-6 rounded-btn-lg border border-border p-6"
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {/* 번호 자체가 전화 링크다 — 휴대폰에서 누르면 바로 걸린다 */}
                <a
                  href={`tel:${h.number}`}
                  aria-label={`${h.name} ${h.number}에 전화 걸기`}
                  className="num text-5xl leading-none text-danger underline decoration-danger/25 decoration-2 underline-offset-8 transition-colors active:text-danger md:text-6xl"
                >
                  {h.number}
                </a>
                <div className="flex flex-col gap-2">
                  <p className="text-base text-foreground">{h.name}</p>
                  <p className="text-sm leading-relaxed text-body">{h.what}</p>
                  <p className="text-sm leading-relaxed text-body">{h.when}</p>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted underline decoration-border underline-offset-2 hover:text-body"
                  >
                    공식 안내 · <span className="num">{fmtDate(h.verifiedOn)}</span> 확인
                  </a>
                  {/* 모바일 전용 통화 버튼 — 번호보다 훨씬 큰 탭 목표 */}
                  <a
                    href={`tel:${h.number}`}
                    className="mt-1 flex min-h-[48px] items-center justify-center rounded-btn-xl bg-danger/[0.08] px-5 text-[15px] font-semibold text-danger transition-colors active:bg-danger/[0.15] md:hidden"
                  >
                    {h.number} 전화 걸기
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 이웃으로서 할 수 있는 일 */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="text-2xl text-foreground">이웃이 할 수 있는 일</h3>
            <div className="flex items-center gap-4">
              <span className="num text-sm text-muted">
                {checked.length} / {NEIGHBOR_ACTIONS.length} 선택
              </span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-elevated" aria-hidden>
                <motion.span
                  className="block h-full rounded-full bg-weak-fg"
                  initial={false}
                  animate={{ width: `${(checked.length / NEIGHBOR_ACTIONS.length) * 100}%` }}
                  transition={{ duration: reduced ? 0 : 0.35, ease: 'easeOut' }}
                />
              </span>
              <button
                type="button"
                onClick={copyChecklist}
                disabled={checked.length === 0}
                className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-muted hover:text-foreground disabled:opacity-35 disabled:hover:border-border focus-visible:ring-primary focus-visible:ring-offset-bg"
              >
                {copied ? '복사했습니다' : '고른 것 복사하기'}
              </button>
            </div>
          </div>
          <p className="max-w-[70ch] text-sm leading-relaxed text-body">
            아래는 저희가 지어낸 미담이 아니라 제도 문서에 적혀 있는 내용입니다. 특히 첫 번째가 이 연구에서
            가장 뜻밖이었습니다. 가족이 아니어도 신청할 수 있습니다. 하기로 마음먹은 것을 골라 두면 근거와 함께
            복사해 갈 수 있습니다.
          </p>
          <ul className="flex max-w-[80ch] flex-col gap-3">
            {NEIGHBOR_ACTIONS.map((a) => {
              const on = checked.includes(a.id);

              // 폰 — 긴 문장을 목록에 다 펼치면 네 항목이 화면 두 개를 차지한다.
              // 한 줄만 보여 주고, 누르면 전문과 근거가 아래에서 올라온다.
              if (mobile) {
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setOpenAction(a.id)}
                      className={cn(
                        'flex min-h-[56px] w-full items-center gap-3 rounded-btn-lg border p-4 text-left transition-colors',
                        on ? 'border-primary/45 bg-weak-bg/60' : 'border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                          on ? 'border-weak-fg bg-weak-fg text-primary-fg' : 'border-muted text-transparent'
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="flex-1 text-sm leading-relaxed text-foreground line-clamp-2">{a.text}</span>
                      <span className="shrink-0 text-muted" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={a.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-4 rounded-btn-lg border p-5 transition-colors ${
                      on ? 'border-primary/45 bg-weak-bg/60' : 'border-border hover:border-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(a.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary focus-visible:ring-primary focus-visible:ring-offset-bg"
                    />
                    <span className="flex flex-col gap-1.5">
                      <span className="text-sm leading-relaxed text-foreground">{a.text}</span>
                      <span className="text-xs text-muted">근거 · {a.basis}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {/* 폰 — 고른 항목의 전문과 근거 */}
          <BottomSheet
            open={mobile && !!action}
            onClose={() => setOpenAction(null)}
            tone="dark"
            title="이웃이 할 수 있는 일"
            subtitle="제도 문서에 적혀 있는 내용입니다"
            footer={
              action ? (
                <button
                  type="button"
                  onClick={() => {
                    toggle(action.id);
                    setOpenAction(null);
                  }}
                  className={cn(
                    'flex min-h-[56px] w-full items-center justify-center rounded-btn-xl text-[17px] font-semibold transition-colors',
                    checked.includes(action.id)
                      ? 'border border-border bg-elevated text-body'
                      : 'bg-primary text-primary-fg active:bg-primary-hover'
                  )}
                >
                  {checked.includes(action.id) ? '고른 것에서 빼기' : '이건 하겠습니다'}
                </button>
              ) : undefined
            }
          >
            {action && (
              <div className="flex flex-col gap-4 pb-2">
                <p className="text-base leading-relaxed text-foreground">{action.text}</p>
                <p className="border-l-[3px] border-weak-fg/45 pl-4 text-sm leading-relaxed text-body">
                  <span className="block text-[13px] font-bold tracking-[0.08em] text-weak-fg">근거</span>
                  {action.basis}
                </p>
              </div>
            )}
          </BottomSheet>
        </div>

        {/* 확인 못 한 것을 확인 못 했다고 적는 자리 */}
        <div className="flex max-w-[74ch] flex-col gap-3 rounded-btn-lg border border-dashed border-border p-6">
          <h3 className="text-lg text-foreground">여기 넣지 않은 것</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-body">
            <li>
              부산 구·군별 안부살핌 사업 — 구마다 이름과 내용이 다르고 해마다 바뀌는데, 공식 안내를 확인하지
              못해 넣지 않았습니다. 사는 구의 주민센터에 물어보는 편이 정확합니다.
            </li>
            <li>
              두 서비스의 전용 콜센터 번호 — 공식 페이지가 열리지 않아 확인하지 못했습니다. 대신 공식 문서에
              나온 창구(읍·면·동 행정복지센터, 129)만 적었습니다.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-body">
            부산에는 「부산광역시 고독사 예방 및 사회적 고립가구 지원을 위한 조례」(2019년 제정)가 있어,
            고독사 현황 파악과 단계별 정책 수립이 시의 의무로 정해져 있습니다.
          </p>
          <p className="border-t border-border pt-3 text-sm leading-relaxed text-body">
            이 페이지의 모든 정보는 <span className="num">2026년 7월 25일</span> 각 기관 공식 사이트에서
            확인했습니다. 제도는 바뀝니다. 실제로 신청하기 전에 129나 주민센터에서 한 번 더 확인해 주세요.
          </p>
        </div>

        {/* 제도 정보야말로 학부모가 다른 가족에게 건네고 싶은 내용이다 — 여기서 공유를 권한다 */}
        <div className="flex flex-col gap-3">
          <ShareButton />
          <UpNext />
        </div>
      </section>
    </div>
  );
}
