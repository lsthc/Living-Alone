import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EmptyState } from '@/components/EmptyState';
import { SourceNote } from '@/components/SourceNote';
import { UpNext } from '@/components/deck/UpNext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { WheelPicker } from '@/components/ui/WheelPicker';
import { WindowGrid } from '@/charts/WindowGrid';
import { rowsOf, useData } from '@/lib/DataProvider';
import { useIsMobile } from '@/lib/useIsMobile';
import { cn, fmtInt } from '@/lib/utils';
import type { AgeBand, Sex } from '@/data/schema';

/**
 * 데이터가 끝내 재지 못한 축.
 *
 * ★ 이것은 위험도 점수가 아니다. 어떤 값을 고르든 좋고 나쁨을 매기지 않는다.
 *   고독사는 건강·관계·소득에서 비롯되는데 우리에겐 그런 자료가 한 줄도 없다.
 *   여기서 하는 일은 딱 하나 — 통계에 없는 칸이 하나 있다는 것을 눈으로 보여주는 것.
 */
const LAST_CALL = [
  { id: 'today', label: '오늘·어제', line: '그 거리는 이미 좁혀져 있습니다. 어떤 통계도 이 칸을 세지 못합니다.' },
  { id: 'week', label: '이번 주', line: '이번 주에 한 번. 어느 표에도 안 잡히지만 그분에게는 가장 크게 잡히는 숫자입니다.' },
  { id: 'month', label: '이번 달', line: '한 달 사이. 다음 챕터의 번호 하나면 오늘 다시 좁힐 수 있습니다.' },
  { id: 'year', label: '올해 안', line: '올해 안. 통계는 이 간격을 재지 않습니다. 재는 사람은 여러분뿐입니다.' },
  { id: 'unknown', label: '기억나지 않습니다', line: '기억나지 않는다면, 그것이 지금 한 번 물어볼 이유입니다.' },
] as const;

/** 사각형 하나가 뜻하는 가구 수. Chapter 0 은 1,000가구였고 여기서는 구 단위라 100가구. */
const UNIT = 100;

const BANDS: AgeBand[] = ['40대', '50대', '60대', '70대', '80대이상'];
const SEXES: Sex[] = ['남', '여'];

/**
 * 선택 칸.
 *
 * 넓은 화면 — 네이티브 select. 키보드·스크린리더가 그냥 동작하고, 발표자는 마우스로 고른다.
 * 폰        — 누르면 아래에서 시트가 올라오고, 손으로 세로로 굴려 가운데에 맞춘 뒤
 *             확인을 눌러야 확정된다. 굴리는 동안 값이 바로 확정되면 지나가는 값마다
 *             아래 화면 전체가 다시 계산돼 손가락이 무거워진다.
 */
function Field({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const id = useId();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // 시트 안에서 굴리는 동안의 임시 값. 확인을 눌러야 바깥으로 나간다.
  const [draft, setDraft] = useState('');

  const current = options.find((o) => o.value === value);

  if (!mobile) {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm text-ink/65">
          {label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-ink/25 bg-paper px-4 py-3 text-base text-ink transition-colors hover:border-ink/45 focus-visible:ring-lamp focus-visible:ring-offset-paper"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-ink/65">{label}</span>
      <button
        type="button"
        onClick={() => {
          setDraft(value || options[0]?.value || '');
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className={cn(
          'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-lg border px-4 text-left transition-colors',
          current ? 'border-weakfg/45 bg-weakbg/50 text-ink' : 'border-ink/25 bg-paper text-ink/45'
        )}
      >
        <span className="text-base">{current?.label ?? placeholder}</span>
        <span className="shrink-0 text-ink/35" aria-hidden>
          ⌄
        </span>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        tone="light"
        title={label}
        subtitle="손으로 위아래로 굴려 가운데에 맞춘 뒤 확인을 눌러 주세요"
        footer={
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
            className="flex min-h-[56px] w-full items-center justify-center rounded-lg bg-lamp text-[17px] font-semibold text-paper transition-colors active:bg-[#2272eb]"
          >
            확인
          </button>
        }
      >
        <WheelPicker
          options={options}
          value={draft || options[0]?.value || ''}
          onChange={setDraft}
          tone="light"
          ariaLabel={label}
        />
      </BottomSheet>
    </div>
  );
}

/** 카드 안의 한 줄. 큰 숫자 하나와 설명. */
function Stat({ value, unit, caption }: { value: string; unit?: string; caption: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-1.5">
        <span className="num text-3xl text-ink md:text-4xl">{value}</span>
        {unit && <span className="text-lg text-ink/65">{unit}</span>}
      </p>
      <p className="text-sm leading-relaxed text-ink/65">{caption}</p>
    </div>
  );
}

/**
 * Chapter 4 — 우리 가족의 거리
 *
 * 2막이 시작되는 자리. 심야 남색이 종이색으로 바뀐다.
 * 앞의 세 장이 도시 전체의 숫자였다면, 여기서는 같은 숫자를 관람객 본인의 좌표 위에 다시 놓는다.
 *
 * ★ 이 챕터의 윤리 규칙: 위험을 예측하지 않는다.
 *   "당신의 가족이 위험합니다" 같은 문장은 데이터로 뒷받침되지 않는 겁주기다.
 *   우리가 가진 것은 집계뿐이고, 개인의 건강·관계·소득은 어디에도 없다.
 *   그래서 확률이 아니라 '위치'만 보여준다. 이 원칙은 화면에도 그대로 적는다.
 */
export function Ch4MyFamily() {
  const { districts, singleDemo, loading } = useData();
  const reduced = useReducedMotion();

  const [sgg, setSgg] = useState('');
  const [band, setBand] = useState('');
  const [sex, setSex] = useState('');
  const [lastCall, setLastCall] = useState<string>('');

  const allDistricts = rowsOf(districts);
  const districtYear = allDistricts.length ? Math.max(...allDistricts.map((r) => r.year)) : null;
  const rows = useMemo(
    () => allDistricts.filter((r) => r.year === districtYear),
    [allDistricts, districtYear]
  );

  const busanSingle = rowsOf(singleDemo).filter((r) => r.region === '부산');
  const singleYear = busanSingle.length ? Math.max(...busanSingle.map((r) => r.year)) : null;
  const singleRows = useMemo(
    () => busanSingle.filter((r) => r.year === singleYear),
    [busanSingle, singleYear]
  );

  // 독거노인 비율 순위 (16개 구·군 중 몇 번째)
  const ranked = useMemo(
    () =>
      [...rows]
        .filter((r) => r.elderly_alone_rate !== null)
        .sort((a, b) => b.elderly_alone_rate! - a.elderly_alone_rate!),
    [rows]
  );

  const picked = sgg ? (rows.find((r) => r.sgg_code === sgg) ?? null) : null;
  const pickedRank = picked ? ranked.findIndex((r) => r.sgg_code === picked.sgg_code) + 1 : 0;

  // 고른 성별·연령대가 부산의 40대 이상 1인세대에서 차지하는 자리
  const cell = useMemo(() => {
    if (!band || !sex || singleRows.length === 0) return null;
    const total = singleRows.reduce((a, r) => a + (r.households ?? 0), 0);
    const me = singleRows.find((r) => r.age_band === band && r.sex === sex);
    if (!me || me.households === null || total <= 0) return null;
    const sorted = [...singleRows]
      .filter((r) => r.households !== null)
      .sort((a, b) => b.households! - a.households!);
    return {
      households: me.households,
      total,
      pct: (me.households / total) * 100,
      rank: sorted.findIndex((r) => r.age_band === band && r.sex === sex) + 1,
      of: sorted.length,
    };
  }, [band, sex, singleRows]);

  const done = !!picked && !!cell;

  // 지목할 칸은 구마다 고정 (렌더할 때마다 옮겨 다니면 안 된다)
  const squares = picked?.elderly_alone ? Math.round(picked.elderly_alone / UNIT) : 0;
  const myIndex = useMemo(() => {
    if (!picked || squares === 0) return 0;
    let h = 7;
    for (const ch of picked.sgg_code) h = (h * 31 + ch.charCodeAt(0)) % 100000;
    return h % squares;
  }, [picked, squares]);

  if (loading) return <section id="ch4" className="chapter min-h-full" aria-busy="true" />;

  return (
    // 2막 — 이 챕터부터 배경이 종이색이다 (덱 패널이 톤을 깔고, 여기서 글자색을 맞춘다)
    <div className="w-full bg-paper text-ink">
      <section id="ch4" className="chapter flex flex-col gap-10 md:gap-14" aria-labelledby="ch4-heading">
        <header className="flex max-w-[70ch] flex-col gap-4">
          <span className="num text-xs tracking-[0.25em] text-weakfg">CHAPTER 4</span>
          <h2 id="ch4-heading" className="font-serif text-headline text-ink">
            우리 가족의 거리
          </h2>
          <p className="leading-relaxed text-ink/65">
            여기까지는 도시 전체의 숫자였습니다. 18만이라는 수는 너무 커서 아무도 아닌 사람처럼 보입니다. 이제
            같은 숫자를 여러분이 아는 한 사람의 자리 위에 다시 놓아 보겠습니다. 혼자 사시는 가족이나 이웃을 한
            분 떠올리고, 세 가지만 골라 주세요.
          </p>
        </header>

        {rows.length === 0 || singleRows.length === 0 ? (
          <EmptyState
            title="데이터 준비 중"
            detail="구·군별 지표 또는 1인세대 자료를 읽지 못했습니다. public/data/03_busan_districts.csv 와 05_single_household_demo.csv 를 확인해 주세요."
          />
        ) : (
          <>
            <form
              className="flex flex-col gap-5 rounded-lg border border-ink/15 bg-ink/[0.03] p-6 md:p-8"
              onSubmit={(e) => e.preventDefault()}
            >
              <fieldset className="flex flex-col gap-5">
                <legend className="sr-only">떠올린 분의 정보 선택</legend>
                <div className="grid gap-5 md:grid-cols-3">
                  <Field
                    label="어느 구·군에 사시나요"
                    value={sgg}
                    onChange={setSgg}
                    placeholder="구·군 선택"
                    options={[...rows]
                      .sort((a, b) => a.sgg_name.localeCompare(b.sgg_name, 'ko'))
                      .map((r) => ({ value: r.sgg_code, label: r.sgg_name }))}
                  />
                  <Field
                    label="연령대"
                    value={band}
                    onChange={setBand}
                    placeholder="연령대 선택"
                    options={BANDS.map((b) => ({ value: b, label: b }))}
                  />
                  <Field
                    label="성별"
                    value={sex}
                    onChange={setSex}
                    placeholder="성별 선택"
                    options={SEXES.map((s) => ({ value: s, label: `${s}성` }))}
                  />
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm leading-relaxed text-ink/70">
                  고른 내용은 이 브라우저 안에서만 계산됩니다. 어디로도 전송되지 않고 저장되지도 않습니다.
                  <br />
                  연령대는 원자료의 공표 구간을 그대로 썼습니다. 40대 미만 1인세대는 이 표에 없습니다.
                </p>
                {(sgg || band || sex) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSgg('');
                      setBand('');
                      setSex('');
                    }}
                    className="rounded-full border border-ink/25 px-4 py-2 text-sm text-ink/65 transition-colors hover:border-ink/50 hover:text-ink focus-visible:ring-lamp focus-visible:ring-offset-paper"
                  >
                    다시 고르기
                  </button>
                )}
              </div>
            </form>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key={`${sgg}-${band}-${sex}`}
                  className="flex flex-col gap-10"
                  initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: reduced ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
                    {/* 왼쪽 — 그 동네의 좌표 */}
                    <div className="flex flex-col gap-7">
                      <h3 className="font-serif text-2xl text-ink">
                        {picked!.sgg_name}에서는
                        {picked!.is_old_downtown && (
                          <span className="ml-3 rounded-full border border-rustdeep/45 bg-rustdeep/10 px-2.5 py-0.5 align-middle text-xs text-rustdeep">
                            원도심
                          </span>
                        )}
                      </h3>

                      {picked!.elderly_alone_rate !== null ? (
                        <Stat
                          value={fmtInt(Math.round(picked!.elderly_alone_rate * 10))}
                          unit="명"
                          caption={`${districtYear}년 ${picked!.sgg_name}에 사는 65세 이상 1,000명 가운데 혼자 사는 분의 수입니다.${
                            pickedRank === 1
                              ? ' 16개 구·군 가운데 이 비율이 가장 높습니다.'
                              : pickedRank
                                ? ` 16개 구·군 가운데 ${pickedRank}번째로 높습니다.`
                                : ''
                          }`}
                        />
                      ) : (
                        <p className="text-sm text-ink/65">{picked!.sgg_name}의 독거노인 비율 값이 비어 있습니다.</p>
                      )}

                      {picked!.elderly_alone !== null && (
                        <Stat
                          value={fmtInt(picked!.elderly_alone)}
                          unit="가구"
                          caption={`${picked!.sgg_name} 한 곳에서만 이만큼의 창문이 혼자 켜집니다.`}
                        />
                      )}

                      <SourceNote sourceIds={['kosis_elderly_alone', 'mois_age']} tone="light" />
                    </div>

                    {/* 오른쪽 — Chapter 0 의 창문이 한 칸으로 돌아온다 */}
                    <div className="flex flex-col gap-4">
                      {squares > 0 ? (
                        <>
                          <WindowGrid
                            key={picked!.sgg_code}
                            count={squares}
                            columns={20}
                            size={13}
                            gap={5}
                            duration={2600}
                            fill="var(--slate)"
                            highlight={{ index: myIndex, fill: 'var(--rust)' }}
                            label={`사각형 ${squares}개로 표현한 ${districtYear}년 ${picked!.sgg_name}의 독거노인 ${fmtInt(picked!.elderly_alone)}가구. 사각형 하나가 ${UNIT}가구를 뜻하고, 붉은 칸 하나는 방금 떠올린 그 한 분의 자리를 가리킨다.`}
                            className="w-full max-w-[560px]"
                          />
                          <p className="max-w-[46ch] text-sm leading-relaxed text-ink/65">
                            사각형 하나가 <span className="num">{UNIT}</span>가구입니다. 붉은 칸 하나가 방금
                            떠올린 그분입니다. Chapter 0 에서 본 <span className="num">18만</span>개의 불빛은
                            이렇게 한 칸씩 모인 것이었습니다.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-ink/65">{picked!.sgg_name}의 독거노인 가구 수 값이 비어 있습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* 같은 칸에 서 있는 사람들 */}
                  <div className="flex flex-col gap-5 border-t border-ink/15 pt-8">
                    <h3 className="font-serif text-2xl text-ink">같은 칸에 서 있는 사람들</h3>
                    <div className="grid gap-8 md:grid-cols-2">
                      <Stat
                        value={fmtInt(cell!.households)}
                        unit="세대"
                        caption={`${singleYear}년 부산의 ${band} ${sex}성 1인세대 수입니다. 40대 이상 1인세대 ${fmtInt(
                          cell!.total
                        )}세대 가운데 ${cell!.pct.toFixed(1)}%로, ${cell!.of}개 칸 중 ${cell!.rank}번째로 큰 칸입니다.`}
                      />
                      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink/65">
                        <p>
                          이 수는 <span className="text-ink/85">혼자 사는 세대</span>의 수이지 고독사 통계가
                          아닙니다. Chapter 3 에서 본 것처럼, 부산의 성별·연령대별 고독사 표는 공표되지 않아
                          여기에 놓을 수 없습니다.
                        </p>
                        <SourceNote sourceIds={['mois_single_age']} tone="light" />
                      </div>
                    </div>
                  </div>

                  {/* 이 챕터에서 가장 중요한 문단 */}
                  <div className="max-w-[74ch] rounded-lg border-l-2 border-rust bg-rust/[0.06] p-6">
                    <h4 className="mb-3 font-serif text-lg text-ink">이 숫자는 확률이 아닙니다</h4>
                    <p className="text-sm leading-relaxed text-ink/70">
                      이 화면은 떠올린 그분이 위험하다고 말하지 않습니다. 그런 말을 할 근거가 우리에게 없습니다.
                      고독사는 건강·관계·소득 같은 개인의 사정에서 비롯되는데, 우리가 가진 자료는 사람을 세어
                      놓은 집계뿐이라 그런 정보가 한 줄도 들어 있지 않습니다. 여기 있는 것은{' '}
                      <span className="text-ink">확률이 아니라 위치</span>입니다. 같은 칸에 몇 명이 서 있는지를
                      보여줄 뿐입니다.
                    </p>
                  </div>

                  {/* 데이터가 재지 못한 마지막 축 */}
                  <div className="flex max-w-[74ch] flex-col gap-5 border-t border-ink/15 pt-8">
                    <p className="font-serif text-xl leading-relaxed text-ink/85 md:text-2xl">
                      그리고 데이터가 끝내 재지 못한 것이 하나 있습니다. 거리입니다.
                    </p>
                    <p className="leading-relaxed text-ink/65">
                      마지막으로 안부를 물은 게 언제인지는 어떤 통계에도 없습니다. 그건 이 화면이 아니라 여러분만
                      압니다. 이 칸만은 직접 채워 보세요.
                    </p>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="마지막으로 안부를 물은 때">
                      {LAST_CALL.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setLastCall(lastCall === o.id ? '' : o.id)}
                          aria-pressed={lastCall === o.id}
                          className={cn(
                            'rounded-full border px-4 py-2 text-sm transition-colors focus-visible:ring-lamp focus-visible:ring-offset-paper',
                            lastCall === o.id
                              ? 'border-weakfg/50 bg-weakbg text-weakfg'
                              : 'border-ink/20 text-ink/65 hover:border-ink/45 hover:text-ink'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.p
                        key={lastCall || 'empty'}
                        className="min-h-[3rem] font-serif text-lg leading-relaxed text-ink/80 md:text-xl"
                        initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        role="status"
                        aria-live="polite"
                      >
                        {LAST_CALL.find((o) => o.id === lastCall)?.line ?? ''}
                      </motion.p>
                    </AnimatePresence>

                    <p className="text-sm leading-relaxed text-ink/55">
                      고른 값은 저장되지도 전송되지도 않고, 어떤 위험도 계산하지 않습니다. 앞의 세 칸과 달리 이
                      칸에는 정답도 평균도 없습니다 — 어디에도 그 값을 모아 둔 데이터가 없기 때문입니다.
                    </p>

                    <p className="leading-relaxed text-ink/65">
                      다음 챕터에서는, 그 거리를 좁히려고 이미 만들어져 있는 것들을 봅니다.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  className="rounded-lg border border-dashed border-ink/25 p-10 text-center leading-relaxed text-ink/65"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  세 가지를 모두 고르면
                  <br />
                  앞에서 본 숫자가 그분의 자리 위에 다시 놓입니다.
                </motion.p>
              )}
            </AnimatePresence>

            <UpNext />
          </>
        )}
      </section>
    </div>
  );
}
