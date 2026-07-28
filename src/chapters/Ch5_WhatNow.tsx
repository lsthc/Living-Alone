import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { HOTLINES, NEIGHBOR_ACTIONS, PROGRAMS, type Program } from '@/data/programs';

/** 공식 사이트에서 확인한 날짜를 사람이 읽는 형태로 */
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
};

function ProgramCard({ program }: { program: Program }) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      className="flex flex-col gap-5 rounded-lg border border-ink/15 bg-ink/[0.03] p-6 md:p-8"
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <header className="flex flex-col gap-1.5">
        <span className="text-xs tracking-wide text-ink/65">{program.org}</span>
        <h3 className="font-serif text-2xl text-ink">{program.name}</h3>
      </header>

      <dl className="flex flex-col gap-4">
        {[
          { k: '무엇을', v: program.what },
          { k: '누구에게', v: program.who },
          { k: '어떻게', v: program.how },
        ].map((row) => (
          <div key={row.k} className="grid gap-1 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-ink/65">{row.k}</dt>
            <dd className="text-sm leading-relaxed text-ink/75">{row.v}</dd>
          </div>
        ))}
      </dl>

      {program.highlight && (
        <p className="rounded-md border-l-2 border-rust bg-rust/[0.07] px-4 py-3 text-sm leading-relaxed text-ink/80">
          {program.highlight}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink/12 pt-4 text-xs text-ink/65">
        {program.cost && <span className="text-ink/65">{program.cost}</span>}
        <a
          href={program.url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-ink/30 underline-offset-2 hover:text-ink/75"
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
  const [checked, setChecked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="w-full bg-paper text-ink">
      <section id="ch5" className="chapter flex flex-col gap-14" aria-labelledby="ch5-heading">
        <header className="flex max-w-[70ch] flex-col gap-4">
          <span className="num text-xs tracking-[0.25em] text-rustdeep">CHAPTER 5</span>
          <h2 id="ch5-heading" className="font-serif text-headline text-ink">
            <BlurText text="그래서 지금 무엇을 할 수 있나" />
          </h2>
          <ScrollRevealText className="leading-relaxed text-ink/65">
            여기까지 오면 대개 이런 말로 끝납니다. "관심을 가집시다." 저희는 그 말이 아무것도 바꾸지 않는다고
            생각했습니다. 그래서 이미 만들어져 있는 제도를 찾아봤습니다. 아래 내용은 전부 각 기관 공식
            사이트에서 직접 확인한 것이고, 확인하지 못한 것은 넣지 않았습니다.
          </ScrollRevealText>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {PROGRAMS.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>

        {/* 지금 바로 걸 수 있는 번호 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">지금 바로 걸 수 있는 번호</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {HOTLINES.map((h) => (
              <motion.div
                key={h.id}
                className="flex items-start gap-6 rounded-lg border border-ink/15 p-6"
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <span className="num text-5xl leading-none text-rust md:text-6xl">{h.number}</span>
                <div className="flex flex-col gap-2">
                  <p className="text-base text-ink">{h.name}</p>
                  <p className="text-sm leading-relaxed text-ink/65">{h.what}</p>
                  <p className="text-sm leading-relaxed text-ink/65">{h.when}</p>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink/65 underline decoration-ink/30 underline-offset-2 hover:text-ink/75"
                  >
                    공식 안내 · <span className="num">{fmtDate(h.verifiedOn)}</span> 확인
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 이웃으로서 할 수 있는 일 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">이웃이 할 수 있는 일</h3>
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink/65">
            아래는 저희가 지어낸 미담이 아니라 제도 문서에 적혀 있는 내용입니다. 특히 첫 번째가 이 연구에서
            가장 뜻밖이었습니다. 가족이 아니어도 신청할 수 있습니다.
          </p>
          <ul className="flex max-w-[80ch] flex-col gap-3">
            {NEIGHBOR_ACTIONS.map((a) => {
              const on = checked.includes(a.id);
              return (
                <li key={a.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-4 rounded-lg border p-5 transition-colors ${
                      on ? 'border-rust/45 bg-rust/[0.06]' : 'border-ink/15 hover:border-ink/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(a.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-rust focus-visible:ring-rust focus-visible:ring-offset-paper"
                    />
                    <span className="flex flex-col gap-1.5">
                      <span className="text-sm leading-relaxed text-ink/85">{a.text}</span>
                      <span className="text-xs text-ink/65">근거 · {a.basis}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 확인 못 한 것을 확인 못 했다고 적는 자리 */}
        <div className="flex max-w-[74ch] flex-col gap-3 rounded-lg border border-dashed border-ink/25 p-6">
          <h3 className="font-serif text-lg text-ink/80">여기 넣지 않은 것</h3>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-ink/65">
            <li>
              부산 구·군별 안부살핌 사업 — 구마다 이름과 내용이 다르고 해마다 바뀌는데, 공식 안내를 확인하지
              못해 넣지 않았습니다. 사는 구의 주민센터에 물어보는 편이 정확합니다.
            </li>
            <li>
              두 서비스의 전용 콜센터 번호 — 공식 페이지가 열리지 않아 확인하지 못했습니다. 대신 공식 문서에
              나온 창구(읍·면·동 행정복지센터, 129)만 적었습니다.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-ink/70">
            부산에는 「부산광역시 고독사 예방 및 사회적 고립가구 지원을 위한 조례」(2019년 제정)가 있어,
            고독사 현황 파악과 단계별 정책 수립이 시의 의무로 정해져 있습니다.
          </p>
          <p className="border-t border-ink/12 pt-3 text-sm leading-relaxed text-ink/65">
            이 페이지의 모든 정보는 <span className="num">2026년 7월 25일</span> 각 기관 공식 사이트에서
            확인했습니다. 제도는 바뀝니다. 실제로 신청하기 전에 129나 주민센터에서 한 번 더 확인해 주세요.
          </p>
        </div>
      </section>
    </div>
  );
}
