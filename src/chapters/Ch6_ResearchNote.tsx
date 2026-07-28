import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BlurText } from '@/components/reactbits/BlurText';
import { ScrollRevealText } from '@/components/reactbits/ScrollRevealText';
import { UpNext } from '@/components/deck/UpNext';
import { ShareButton } from '@/components/StoryNav';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH1, judgeH2, judgeH3, type Verdict } from '@/lib/hypothesis';
import { HOTLINES, PROGRAMS } from '@/data/programs';
import { cn } from '@/lib/utils';

const TEAM = {
  org: '부산정보영재교육원',
  grade: '중학교 2학년',
  members: ['김동윤', '박찬우', '이연우', '이선호'],
};

/** 종이색 배경에서 쓰는 판정 배지 색 */
const VERDICT_STYLE: Record<Verdict, string> = {
  채택: 'border-weakfg/40 bg-weakbg text-weakfg',
  부분채택: 'border-weakfg/40 text-weakfg',
  기각: 'border-ink/25 bg-ink/[0.05] text-ink/65',
  검증불가: 'border-ink/25 bg-ink/[0.05] text-ink/65',
};

/**
 * 이 연구가 인정하는 한계.
 *
 * 발표에서 질문받기 전에 우리가 먼저 말한다. 감추면 신뢰를 잃고, 먼저 말하면 신뢰를 얻는다.
 * 문장은 전부 '무엇을 못 했는가 → 그래서 어떻게 했는가' 순서로 쓴다.
 */
const LIMITATIONS = [
  {
    title: '"30년 이상 노후주택"을 계산할 수 없었다',
    body: '주택총조사의 건축연도 공표 구간이 1979년 이전 / 1980~1989 / 1990~1999 뿐이라 "준공 30년 이상"을 정확히 끊을 수 없습니다. 그래서 이 앱은 1989년 이전 준공(2024년 기준 35년 이상) 비율을 썼고, 화면에도 그렇게 적었습니다.',
  },
  {
    title: '독거노인 비율은 분자와 분모의 조사가 다르다',
    body: '분자인 독거노인 수는 인구총조사, 분모인 65세 이상 인구는 주민등록 기준입니다. 조사 방식이 섞여 있어 절대값은 조사에 따라 달라질 수 있습니다. 구 사이의 상대 비교에는 쓸 수 있다고 판단해 그대로 썼습니다.',
  },
  {
    title: '부산의 성별×연령 고독사 표가 없다',
    body: '보건복지부 고독사 실태조사는 시·도별 발생 건수까지만 공개하고, 성별과 연령을 교차한 표는 전국 단위로만 공개합니다. 그래서 H3 은 검증불가입니다. 전국 비율을 부산 건수에 곱해 추정치를 만들 수도 있었지만 그건 데이터가 아니라 가정이라 만들지 않았습니다.',
  },
  {
    title: '2011~2014년 값이 비어 있다',
    body: '독거노인 수는 인구총조사 기준인데 그 사이 조사가 없어 값이 없습니다. 빈칸을 앞뒤 값으로 메우지 않고 비운 채로 뒀고, Chapter 1 의 꺾은선에서도 그 구간에 점을 찍지 않아 공백이 눈에 보이게 했습니다.',
  },
  {
    title: '상관관계는 인과관계가 아니다',
    body: 'Chapter 2 의 노후주택 비율과 독거노인 비율은 함께 움직이지만(r = 0.76), 오래된 집이 고립을 만든다는 뜻은 아닙니다. 두 지표 모두 "산업이 떠난 원도심"이라는 같은 원인의 결과일 수 있습니다.',
  },
  {
    title: '넣으려다 뺀 것 — 인구소멸위험지수',
    body: '연구 초반에 인구소멸위험지역 지표를 넣으려 했지만, 한국고용정보원 원자료로 직접 대조하지 못해 앱에 넣지 않았습니다. 확인하지 못한 수치는 싣지 않는다는 규칙을 여기에도 적용했습니다.',
  },
];

/**
 * Chapter 6 — 연구 노트
 *
 * 마지막 장. 우리가 무엇을 어떻게 했고, 무엇을 못 했는지 전부 적는다.
 * 판정 표는 화면에 하드코딩하지 않고 `hypothesis.ts` 가 계산한 값을 그대로 렌더링한다.
 * 데이터를 갱신하면 이 표도 자동으로 바뀐다.
 */
export function Ch6ResearchNote() {
  const { trend, deaths, districts, demo, sources } = useData();
  const reduced = useReducedMotion();

  const trendRows = rowsOf(trend);
  const deathRows = rowsOf(deaths);
  const districtRows = rowsOf(districts);
  const demoRows = rowsOf(demo);
  const sourceRows = rowsOf(sources);

  const results = useMemo(
    () => [judgeH1(trendRows, deathRows), judgeH2(districtRows), judgeH3(demoRows)],
    [trendRows, deathRows, districtRows, demoRows]
  );

  // 표는 근거 한 줄만 보여주고, 왜 그 판정이 나왔는지는 눌러서 편다.
  // 발표에서 질문이 나온 줄만 열어 보이면 화면이 글로 덮이지 않는다.
  const [openVerdict, setOpenVerdict] = useState<string | null>(null);
  // 한계도 같은 규칙. 처음엔 제목만 보이고, 궁금한 것만 편다.
  const [openLimit, setOpenLimit] = useState<string | null>(null);
  // 출처가 20건 가까이 된다. "그 수치 어디서 났나요"에 바로 답하려면 찾을 수 있어야 한다.
  const [query, setQuery] = useState('');

  const filteredSources = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sourceRows;
    return sourceRows.filter((s) =>
      [s.org, s.title, String(s.year), s.note ?? ''].join(' ').toLowerCase().includes(q)
    );
  }, [sourceRows, query]);

  return (
    <div className="w-full bg-paper text-ink">
      <section id="ch6" className="chapter flex flex-col gap-12 md:gap-16" aria-labelledby="ch6-heading">
        <header className="flex max-w-[70ch] flex-col gap-4">
          <span className="num text-xs tracking-[0.25em] text-weakfg">CHAPTER 6</span>
          <h2 id="ch6-heading" className="font-serif text-headline text-ink">
            <BlurText text="연구 노트" />
          </h2>
          <ScrollRevealText className="leading-relaxed text-ink/65">
            지금까지 본 것을 어떻게 만들었는지, 그리고 무엇을 못 했는지 적습니다. 이 장은 발표를 잘 보이게
            하려고 쓰는 것이 아니라, 다음 사람이 저희 작업을 검증하고 이어받을 수 있게 하려고 씁니다.
          </ScrollRevealText>
        </header>

        {/* 가설 판정 요약 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">가설 세 개, 판정 세 개</h3>
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink/65">
            아래 표는 손으로 쓴 것이 아닙니다.{' '}
            <code className="font-mono rounded bg-ink/[0.06] px-1.5 py-0.5 text-[0.85em]">src/lib/hypothesis.ts</code> 의
            순수 함수가 CSV 를 읽어 계산한 결과를 그대로 그린 것입니다. 데이터를 갱신하면 판정도 따라 바뀝니다.
            결론을 먼저 정해 놓고 데이터를 맞추지 않으려고 이렇게 만들었습니다. 각 줄을 누르면 왜 그 판정이
            나왔는지 펼쳐집니다.
          </p>

          <ul className="flex flex-col">
            {results.map((r, i) => {
              const open = openVerdict === r.id;
              return (
                <motion.li
                  key={r.id}
                  className="border-b border-ink/12"
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.1 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenVerdict(open ? null : r.id)}
                    aria-expanded={open}
                    className="flex w-full items-start gap-4 py-5 text-left transition-colors hover:bg-ink/[0.03] focus-visible:ring-lamp focus-visible:ring-offset-paper md:gap-6"
                  >
                    <span className="flex w-[9rem] shrink-0 flex-col gap-1 md:w-[13rem]">
                      <span className="num text-xs text-ink/65">{r.id}</span>
                      <span className="font-serif text-lg leading-snug text-ink">{r.title}</span>
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 inline-block shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm',
                        VERDICT_STYLE[r.verdict]
                      )}
                    >
                      {r.verdict}
                    </span>
                    <span className="num flex-1 text-sm leading-relaxed text-ink/70">{r.evidence}</span>
                    <span
                      className={cn(
                        'mt-1 shrink-0 text-ink/45 transition-transform',
                        open && 'rotate-180'
                      )}
                      aria-hidden
                    >
                      ⌄
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        className="overflow-hidden"
                        initial={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
                      >
                        <p className="max-w-[74ch] pb-6 text-sm leading-relaxed text-ink/70">{r.interpretation}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>

          <p className="max-w-[70ch] text-sm leading-relaxed text-ink/65">
            세 개 중 하나가 <span className="text-ink">검증불가</span>로 남았습니다. 저희는 이것을 실패가 아니라
            결과로 봅니다. 공개된 데이터로 알 수 없는 것이 무엇인지 아는 것도 연구가 알아낸 것입니다.
          </p>
        </div>

        {/* 어떻게 만들었나 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">어떻게 만들었나</h3>
          <ol className="flex max-w-[74ch] list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed text-ink/70">
            <li>
              가설 세 개와 <span className="text-ink">판정 기준을 먼저</span> 정했습니다. 데이터를 보고 나서 기준을
              만들면 무엇이든 맞출 수 있기 때문입니다. H1 의 기준(2019년부터의 연평균 증가율 격차 1%p)은 코드에 상수로
              박아 뒀고, 실제로 그 기준 때문에 H1 은 채택이 아니라 부분채택이 됐습니다.
            </li>
            <li>
              행정안전부 주민등록 통계와 국가데이터처(통계청) KOSIS 를 스크립트로 내려받았습니다. 손으로 옮겨
              적으면 틀리기 때문입니다. 보건복지부 고독사 수치만 API 가 없어 보도자료 원문에서 전사했습니다.
            </li>
            <li>
              검산했습니다. 16개 구·군의 독거노인 합계 187,176 이 부산시 전체값과 정확히 일치했고, 2023년 전국
              고독사 남성 3,035 + 연령미상 18 = 3,053 이 보도자료 값과 일치했습니다.
            </li>
            <li>
              판정 로직을 화면과 분리해 순수 함수로 만들고 테스트 23개를 붙였습니다. 화면은 결과를 그리기만 합니다.
              그중 하나는 &lsquo;부산이 더 빨라도 격차가 1%p 에 못 미치면 미달로 처리하는가&rsquo;를 확인하는
              테스트입니다.
            </li>
            <li>제도 정보는 각 기관 공식 사이트에서 직접 확인하고, 확인 못 한 것은 뺐다고 화면에 적었습니다.</li>
          </ol>

          <div className="max-w-[74ch] rounded-lg border border-ink/15 bg-ink/[0.04] p-5">
            <p className="mb-3 text-sm text-ink/65">누구든 아래 명령으로 데이터를 다시 만들 수 있습니다.</p>
            <pre className="font-mono overflow-x-auto text-xs leading-relaxed text-ink/75 tabular-nums">
              <code>{`npm install\nnpm run data:fetch   # 원자료 내려받기 (KOSIS API 키 필요)\nnpm run data:build   # public/data/*.csv 생성\nnpm test             # 가설 판정 함수 테스트`}</code>
            </pre>
          </div>
        </div>

        {/* 한계 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">이 연구가 못 한 것</h3>
          <p className="max-w-[70ch] text-sm leading-relaxed text-ink/65">
            질문받기 전에 먼저 적습니다. 감추면 신뢰를 잃고 먼저 말하면 신뢰를 얻는다고 생각했습니다.
          </p>
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {LIMITATIONS.map((l, i) => {
              const open = openLimit === l.title;
              return (
                <motion.div
                  key={l.title}
                  className={cn(
                    'flex flex-col gap-2 border-l-2 pl-5 transition-colors',
                    open ? 'border-weakfg/60' : 'border-ink/20'
                  )}
                  initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: reduced ? 0 : (i % 2) * 0.08 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenLimit(open ? null : l.title)}
                    aria-expanded={open}
                    className="flex items-start justify-between gap-3 py-1 text-left focus-visible:ring-lamp focus-visible:ring-offset-paper"
                  >
                    <h4 className="font-serif text-base text-ink">{l.title}</h4>
                    <span className={cn('shrink-0 text-ink/45 transition-transform', open && 'rotate-180')} aria-hidden>
                      ⌄
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.p
                        className="overflow-hidden text-sm leading-relaxed text-ink/65"
                        initial={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: reduced ? 'auto' : 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.28, ease: 'easeOut' }}
                      >
                        {l.body}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 출처 전체 */}
        <div className="flex flex-col gap-5">
          <h3 className="font-serif text-2xl text-ink">쓴 자료 전부</h3>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm text-ink/65">
                데이터{' '}
                <span className="num text-ink/45">
                  {query ? `${filteredSources.length} / ${sourceRows.length}` : sourceRows.length}건
                </span>
              </h4>
              <label className="flex items-center gap-2 text-sm text-ink/65">
                <span className="sr-only">출처 검색</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="기관·자료 이름으로 찾기"
                  className="w-56 rounded-md border border-ink/20 bg-paper px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink/40 hover:border-ink/40 focus-visible:ring-lamp focus-visible:ring-offset-paper"
                />
              </label>
            </div>
            {sourceRows.length === 0 ? (
              <p className="text-sm text-ink/65">출처 목록을 불러오지 못했습니다.</p>
            ) : filteredSources.length === 0 ? (
              <p className="text-sm text-ink/65">
                &lsquo;{query}&rsquo; 로 찾은 자료가 없습니다. 기관 이름(예: 통계청)이나 자료 이름의 일부로 찾아
                보세요.
              </p>
            ) : (
              <ol className="flex flex-col gap-3">
                {filteredSources.map((s, i) => (
                  <li key={s.id} className="flex gap-4 border-b border-ink/12 pb-3 text-sm">
                    <span className="num shrink-0 text-ink/65">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex flex-col gap-1">
                      <span className="text-ink/80">
                        {s.org}, 「{s.title}」({s.year})
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/65">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-ink/30 underline-offset-2 hover:text-ink/75"
                        >
                          원자료
                        </a>
                        <span>{s.license}</span>
                        {s.note && <span>{s.note}</span>}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <h4 className="text-sm text-ink/65">제도 정보 (Chapter 5)</h4>
            <ol className="flex flex-col gap-3">
              {[
                ...PROGRAMS.map((p) => ({ id: p.id, label: `${p.org} — ${p.name}`, url: p.url, on: p.verifiedOn })),
                ...HOTLINES.map((h) => ({
                  id: h.id,
                  label: `${h.name} (${h.number})`,
                  url: h.url,
                  on: h.verifiedOn,
                })),
              ].map((s, i) => (
                <li key={s.id} className="flex gap-4 border-b border-ink/12 pb-3 text-sm">
                  <span className="num shrink-0 text-ink/65">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-ink/80">{s.label}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-xs text-ink/65">
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-ink/30 underline-offset-2 hover:text-ink/75"
                      >
                        공식 안내
                      </a>
                      <span className="num">{s.on} 확인</span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* 팀 */}
        <footer className="flex flex-col gap-5 border-t border-ink/20 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink/65">
                {TEAM.org} · {TEAM.grade}
              </p>
              <p className="font-serif text-2xl text-ink">{TEAM.members.join(' · ')}</p>
            </div>
            <p className="num text-sm text-ink/65">혼자 남겨진 도시, 부산 · 2026</p>
          </div>

          <p className="max-w-[70ch] font-serif text-lg leading-relaxed text-ink/75">
            저희가 이 작업에서 지킨 규칙은 하나였습니다. 가설이 틀리면 틀렸다고 쓴다. 세 개 중 하나는 끝내
            검증하지 못했고, 그 칸은 비워 둔 채로 두었습니다.
          </p>

          <div className="flex flex-col gap-3">
            <ShareButton tone="light" />
            <UpNext />
          </div>
        </footer>
      </section>
    </div>
  );
}
