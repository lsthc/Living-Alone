import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HOTLINES, NEIGHBOR_ACTIONS, PROGRAMS } from '@/data/programs';
import type { AgeBand, Sex } from '@/data/schema';
import { rowsOf, useData } from '@/lib/DataProvider';
import { judgeH1, judgeH2, judgeH3 } from '@/lib/hypothesis';
import { fmtInt, fmtPct } from '@/lib/utils';

const CHAPTERS = [
  { id: 'ch0', number: '00', kicker: 'PROLOGUE', title: '혼자 켜지는 창문', accent: '#7db7ff' },
  { id: 'ch1', number: '01', kicker: 'HYPOTHESIS 01', title: '부산은 더 빠른가', accent: '#53d5ff' },
  { id: 'ch2', number: '02', kicker: 'HYPOTHESIS 02', title: '어디가 가장 외로운가', accent: '#8a7dff' },
  { id: 'ch3', number: '03', kicker: 'HYPOTHESIS 03', title: '누가 혼자 떠나는가', accent: '#ff7a9d' },
  { id: 'ch4', number: '04', kicker: 'PERSONAL VIEW', title: '우리 가족의 거리', accent: '#ffb86b' },
  { id: 'ch5', number: '05', kicker: 'ACTION', title: '지금 할 수 있는 일', accent: '#61d095' },
  { id: 'ch6', number: '06', kicker: 'RESEARCH NOTE', title: '끝까지 남긴 기록', accent: '#ffd166' },
] as const;

const AGE_BANDS: AgeBand[] = ['40대', '50대', '60대', '70대', '80대이상'];
const SEXES: Sex[] = ['남', '여'];

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return <span aria-hidden>{direction === 'left' ? '‹' : '›'}</span>;
}

function ChapterShell({
  meta,
  eyebrow,
  title,
  description,
  children,
  light = false,
}: {
  meta: (typeof CHAPTERS)[number];
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <section
      id={meta.id}
      className={`deck-slide ${light ? 'deck-slide--light' : ''}`}
      style={{ '--chapter-accent': meta.accent } as React.CSSProperties}
      aria-labelledby={`${meta.id}-title`}
    >
      <div className="deck-ambient" aria-hidden />
      <div className="deck-copy">
        <div className="deck-eyebrow">
          <span>{meta.number}</span>
          <span>{eyebrow}</span>
        </div>
        <h1 id={`${meta.id}-title`}>{title}</h1>
        <div className="deck-description">{description}</div>
      </div>
      <div className="deck-interaction">{children}</div>
    </section>
  );
}

function Chip({
  active,
  children,
  onClick,
  light = false,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  light?: boolean;
}) {
  return (
    <button
      type="button"
      className={`deck-chip ${active ? 'is-active' : ''} ${light ? 'is-light' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WindowChapter({ meta }: { meta: (typeof CHAPTERS)[0] }) {
  const { trend, loading } = useData();
  const latest = rowsOf(trend)
    .filter((row) => row.region === '부산' && row.elderly_alone !== null)
    .sort((a, b) => b.year - a.year)[0];
  const total = Math.max(1, Math.round((latest?.elderly_alone ?? 187176) / 1000));
  const [revealed, setRevealed] = useState(Math.round(total * 0.46));

  useEffect(() => {
    setRevealed(Math.round(total * 0.46));
  }, [total]);

  return (
    <ChapterShell
      meta={meta}
      eyebrow="부산의 밤"
      title={
        <>
          불빛 <em>{fmtInt(latest?.elderly_alone ?? null)}</em>개가
          <br />
          혼자 켜집니다.
        </>
      }
      description={
        <>
          사각형 하나는 독거노인 1,000가구입니다.
          <br />
          슬라이더를 움직여 도시의 창문을 직접 켜 보세요.
        </>
      }
    >
      <div className="window-panel">
        <div className="window-grid" role="img" aria-label={`${revealed}개의 창문이 켜진 부산 독거노인 가구 격자`}>
          {Array.from({ length: total }, (_, index) => (
            <button
              type="button"
              key={index}
              tabIndex={-1}
              className={index < revealed ? 'is-on' : ''}
              aria-hidden
              onClick={() => setRevealed(index + 1)}
            />
          ))}
        </div>
        <div className="deck-range-block">
          <div>
            <span>켜진 창문</span>
            <strong>{Math.round((revealed / total) * 100)}%</strong>
          </div>
          <input
            aria-label="켜진 창문 비율"
            type="range"
            min="1"
            max={total}
            value={revealed}
            onChange={(event) => setRevealed(Number(event.target.value))}
          />
          <p>
            <strong>{fmtInt(revealed * 1000)}</strong> / {fmtInt(latest?.elderly_alone ?? null)}가구
            <span>{loading ? '데이터 불러오는 중' : `${latest?.year ?? 2024}년 부산`}</span>
          </p>
        </div>
      </div>
    </ChapterShell>
  );
}

type TrendMetric = 'elderly_alone' | 'elderly_alone_rate';

function TrendChapter({ meta }: { meta: (typeof CHAPTERS)[1] }) {
  const { trend, deaths } = useData();
  const [metric, setMetric] = useState<TrendMetric>('elderly_alone');
  const data = rowsOf(trend);
  const years = useMemo(
    () =>
      [...new Set(data.filter((row) => row[metric] !== null).map((row) => row.year))].sort(
        (a, b) => a - b
      ),
    [data, metric]
  );
  const [yearIndex, setYearIndex] = useState(Math.max(0, years.length - 1));
  useEffect(() => setYearIndex(Math.max(0, years.length - 1)), [metric, years.length]);
  const year = years[yearIndex];
  const values = (['부산', '전국'] as const).map((region) => {
    const row = data.find((item) => item.year === year && item.region === region);
    const first = data
      .filter((item) => item.region === region && item[metric] !== null)
      .sort((a, b) => a.year - b.year)[0];
    return {
      region,
      value: row?.[metric] ?? null,
      index:
        row?.[metric] !== null && row?.[metric] !== undefined && first?.[metric]
          ? (row[metric]! / first[metric]!) * 100
          : null,
    };
  });
  const maxIndex = Math.max(100, ...values.map((item) => item.index ?? 0));
  const verdict = useMemo(() => judgeH1(data, rowsOf(deaths)), [data, deaths]);

  return (
    <ChapterShell
      meta={meta}
      eyebrow="가설 H1"
      title={
        <>
          “부산은 전국보다
          <br />
          <em>더 빠르게</em> 고립될까?”
        </>
      }
      description={
        <>
          도시 크기가 달라도 속도는 비교할 수 있습니다.
          <br />
          기준연도를 100으로 놓고 시간을 이동해 보세요.
        </>
      }
    >
      <div className="compare-panel">
        <div className="deck-toolbar">
          <div>
            <Chip active={metric === 'elderly_alone'} onClick={() => setMetric('elderly_alone')}>
              독거노인 수
            </Chip>
            <Chip
              active={metric === 'elderly_alone_rate'}
              onClick={() => setMetric('elderly_alone_rate')}
            >
              독거 비율
            </Chip>
          </div>
          <span className="verdict-badge">{verdict.verdict}</span>
        </div>
        <div className="compare-bars">
          {values.map((item) => (
            <div key={item.region} className={`compare-row ${item.region === '부산' ? 'is-busan' : ''}`}>
              <span>{item.region}</span>
              <div>
                <motion.i
                  animate={{ width: `${Math.max(4, ((item.index ?? 0) / maxIndex) * 100)}%` }}
                  transition={{ duration: 0.45 }}
                />
              </div>
              <strong>{item.index?.toFixed(0) ?? '—'}</strong>
            </div>
          ))}
        </div>
        <div className="deck-range-block">
          <div>
            <span>비교 연도</span>
            <strong>{year ?? '—'}</strong>
          </div>
          <input
            type="range"
            aria-label="비교 연도"
            min="0"
            max={Math.max(0, years.length - 1)}
            value={yearIndex}
            onChange={(event) => setYearIndex(Number(event.target.value))}
          />
          <p>
            지수는 각 지역의 첫 측정연도 = 100
            <span>가설 판정은 사전 등록 기준을 사용</span>
          </p>
        </div>
      </div>
    </ChapterShell>
  );
}

function DistrictChapter({ meta }: { meta: (typeof CHAPTERS)[2] }) {
  const { districts } = useData();
  const rows = rowsOf(districts);
  const year = rows.length ? Math.max(...rows.map((row) => row.year)) : 0;
  const latest = useMemo(
    () =>
      rows
        .filter((row) => row.year === year && row.elderly_alone_rate !== null)
        .sort((a, b) => b.elderly_alone_rate! - a.elderly_alone_rate!),
    [rows, year]
  );
  const [selectedCode, setSelectedCode] = useState('');
  const [oldOnly, setOldOnly] = useState(false);
  useEffect(() => {
    if (!selectedCode && latest[0]) setSelectedCode(latest[0].sgg_code);
  }, [latest, selectedCode]);
  const visible = oldOnly ? latest.filter((row) => row.is_old_downtown) : latest;
  const selected = latest.find((row) => row.sgg_code === selectedCode) ?? latest[0];
  const max = Math.max(...latest.map((row) => row.elderly_alone_rate ?? 0), 1);
  const verdict = useMemo(() => judgeH2(rows), [rows]);

  return (
    <ChapterShell
      meta={meta}
      eyebrow="가설 H2"
      title={
        <>
          16개 구·군은
          <br />
          <em>같이 늙지 않았습니다.</em>
        </>
      }
      description={
        <>
          구·군 카드를 눌러 독거노인 비율과 노후주택 비율을 비교하세요.
          <br />
          원도심만 따로 볼 수도 있습니다.
        </>
      }
    >
      <div className="district-panel">
        <div className="deck-toolbar">
          <div>
            <Chip active={!oldOnly} onClick={() => setOldOnly(false)}>
              전체 16개
            </Chip>
            <Chip active={oldOnly} onClick={() => setOldOnly(true)}>
              원도심만
            </Chip>
          </div>
          <span className="verdict-badge">{verdict.verdict}</span>
        </div>
        <div className="district-grid">
          {visible.map((row, index) => (
            <button
              type="button"
              key={row.sgg_code}
              className={selected?.sgg_code === row.sgg_code ? 'is-active' : ''}
              onClick={() => setSelectedCode(row.sgg_code)}
              title={`${row.sgg_name} ${fmtPct(row.elderly_alone_rate)}`}
            >
              <i style={{ height: `${Math.max(18, ((row.elderly_alone_rate ?? 0) / max) * 100)}%` }} />
              <span>{row.sgg_name}</span>
              <small>{oldOnly ? index + 1 : latest.findIndex((item) => item.sgg_code === row.sgg_code) + 1}위</small>
            </button>
          ))}
        </div>
        {selected && (
          <motion.div
            key={selected.sgg_code}
            className="district-detail"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <span>{selected.is_old_downtown ? '원도심' : '비원도심'}</span>
              <strong>{selected.sgg_name}</strong>
            </div>
            <dl>
              <div>
                <dt>독거노인 비율</dt>
                <dd>{fmtPct(selected.elderly_alone_rate)}</dd>
              </div>
              <div>
                <dt>노후주택 비율</dt>
                <dd>{fmtPct(selected.old_housing_rate)}</dd>
              </div>
              <div>
                <dt>고령화율</dt>
                <dd>{fmtPct(selected.aging_rate)}</dd>
              </div>
            </dl>
          </motion.div>
        )}
      </div>
    </ChapterShell>
  );
}

function WhoChapter({ meta }: { meta: (typeof CHAPTERS)[3] }) {
  const { demo, singleDemo } = useData();
  const [sex, setSex] = useState<Sex>('남');
  const [age, setAge] = useState<AgeBand>('50대');
  const demoRows = rowsOf(demo);
  const singleRows = rowsOf(singleDemo);
  const demoYear = Math.max(0, ...demoRows.map((row) => row.year));
  const singleYear = Math.max(0, ...singleRows.map((row) => row.year));
  const death = demoRows.find(
    (row) => row.year === demoYear && row.region === '전국' && row.sex === sex && row.age_band === age
  );
  const household = singleRows.find(
    (row) => row.year === singleYear && row.region === '부산' && row.sex === sex && row.age_band === age
  );
  const verdict = useMemo(() => judgeH3(demoRows), [demoRows]);

  return (
    <ChapterShell
      meta={meta}
      eyebrow="가설 H3"
      title={
        <>
          보이는 숫자보다
          <br />
          <em>비어 있는 칸</em>이 중요합니다.
        </>
      }
      description={
        <>
          성별과 연령을 조합해 두 통계를 나란히 보세요.
          <br />
          부산의 성별×연령 고독사 자료는 공표되지 않았습니다.
        </>
      }
    >
      <div className="who-panel">
        <div className="deck-toolbar">
          <div>
            {SEXES.map((item) => (
              <Chip key={item} active={sex === item} onClick={() => setSex(item)}>
                {item}성
              </Chip>
            ))}
          </div>
          <span className="verdict-badge is-empty">{verdict.verdict}</span>
        </div>
        <div className="age-selector" role="tablist" aria-label="연령대 선택">
          {AGE_BANDS.map((item) => (
            <button
              type="button"
              key={item}
              className={age === item ? 'is-active' : ''}
              onClick={() => setAge(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="who-compare">
          <motion.article key={`death-${sex}-${age}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span>{demoYear} 전국 고독사</span>
            <strong>{fmtPct(death?.share_pct)}</strong>
            <p>
              {age} {sex}성이 전체 고독사에서 차지한 비율
            </p>
          </motion.article>
          <motion.article key={`single-${sex}-${age}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span>{singleYear} 부산 1인세대</span>
            <strong>{fmtInt(household?.households)}</strong>
            <p>
              부산에서 혼자 사는 {age} {sex}성 세대
            </p>
          </motion.article>
          <article className="is-missing">
            <span>부산 고독사 교차표</span>
            <strong>DATA NOT PUBLISHED</strong>
            <p>추정값으로 채우지 않고, 모르는 것은 모른다고 남겼습니다.</p>
          </article>
        </div>
      </div>
    </ChapterShell>
  );
}

function FamilyChapter({ meta }: { meta: (typeof CHAPTERS)[4] }) {
  const { districts, singleDemo } = useData();
  const districtRows = rowsOf(districts);
  const year = Math.max(0, ...districtRows.map((row) => row.year));
  const latest = useMemo(() => districtRows.filter((row) => row.year === year), [districtRows, year]);
  const singleRows = rowsOf(singleDemo);
  const singleYear = Math.max(0, ...singleRows.map((row) => row.year));
  const singles = singleRows.filter((row) => row.year === singleYear && row.region === '부산');
  const [district, setDistrict] = useState('');
  const [age, setAge] = useState<AgeBand>('70대');
  const [sex, setSex] = useState<Sex>('여');
  useEffect(() => {
    if (!district && latest[0]) setDistrict(latest[0].sgg_code);
  }, [district, latest]);
  const place = latest.find((row) => row.sgg_code === district);
  const group = singles.find((row) => row.age_band === age && row.sex === sex);
  const rank =
    place &&
    [...latest]
      .filter((row) => row.elderly_alone_rate !== null)
      .sort((a, b) => b.elderly_alone_rate! - a.elderly_alone_rate!)
      .findIndex((row) => row.sgg_code === place.sgg_code) + 1;

  return (
    <ChapterShell
      meta={meta}
      light
      eyebrow="숫자에서 한 사람으로"
      title={
        <>
          통계 속에
          <br />
          <em>아는 얼굴</em>을 놓아보세요.
        </>
      }
      description={
        <>
          지역·연령·성별을 골라 그 사람이 서 있는 통계적 위치를 봅니다.
          <br />
          이 결과는 위험 확률이 아니라 집계 속 위치입니다.
        </>
      }
    >
      <div className="family-panel">
        <div className="family-fields">
          <label>
            <span>사는 곳</span>
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              {[...latest]
                .sort((a, b) => a.sgg_name.localeCompare(b.sgg_name, 'ko'))
                .map((row) => (
                  <option key={row.sgg_code} value={row.sgg_code}>
                    {row.sgg_name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>연령대</span>
            <select value={age} onChange={(event) => setAge(event.target.value as AgeBand)}>
              {AGE_BANDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>성별</span>
            <select value={sex} onChange={(event) => setSex(event.target.value as Sex)}>
              {SEXES.map((item) => (
                <option key={item} value={item}>
                  {item}성
                </option>
              ))}
            </select>
          </label>
        </div>
        <motion.div
          key={`${district}-${age}-${sex}`}
          className="family-result"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="family-pin" aria-hidden>
            <i />
            <span>그 한 사람</span>
          </div>
          <div>
            <span>{place?.sgg_name ?? '부산'}의 좌표</span>
            <strong>
              65세 이상 1,000명 중 <em>{Math.round((place?.elderly_alone_rate ?? 0) * 10)}명</em>이 혼자 삽니다.
            </strong>
            <p>
              부산 16개 구·군 중 {rank || '—'}번째 · 같은 {age} {sex}성 1인세대{' '}
              {fmtInt(group?.households)}가구
            </p>
          </div>
        </motion.div>
        <p className="ethics-note">
          <span>!</span>
          개인의 건강·관계·소득을 모르는 집계 데이터로 “위험하다”고 예측하지 않습니다.
        </p>
      </div>
    </ChapterShell>
  );
}

function ActionChapter({ meta }: { meta: (typeof CHAPTERS)[5] }) {
  const [programIndex, setProgramIndex] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const program = PROGRAMS[programIndex];
  const toggle = (id: string) =>
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  return (
    <ChapterShell
      meta={meta}
      light
      eyebrow="이미 존재하는 답"
      title={
        <>
          “관심을 가집시다”에서
          <br />
          <em>한 걸음 더.</em>
        </>
      }
      description={
        <>
          공식 문서에서 확인한 제도와 연락처만 모았습니다.
          <br />
          오늘 할 수 있는 행동을 골라 체크해 보세요.
        </>
      }
    >
      <div className="action-panel">
        <div className="deck-toolbar">
          <div>
            {PROGRAMS.map((item, index) => (
              <Chip
                key={item.id}
                active={programIndex === index}
                light
                onClick={() => setProgramIndex(index)}
              >
                {item.name.replace('서비스', '')}
              </Chip>
            ))}
          </div>
          <span className="action-score">
            {checked.length}/{NEIGHBOR_ACTIONS.length} 완료
          </span>
        </div>
        <motion.article
          key={program.id}
          className="program-card"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <span>{program.org}</span>
          <h2>{program.name}</h2>
          <p>{program.highlight}</p>
          <dl>
            <div>
              <dt>신청</dt>
              <dd>{program.how}</dd>
            </div>
            <div>
              <dt>비용</dt>
              <dd>{program.cost ?? '공식 안내 확인'}</dd>
            </div>
          </dl>
        </motion.article>
        <div className="action-checklist">
          {NEIGHBOR_ACTIONS.map((item, index) => (
            <label key={item.id} className={checked.includes(item.id) ? 'is-checked' : ''}>
              <input
                type="checkbox"
                checked={checked.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span>{index + 1}</span>
              <p>{item.text}</p>
            </label>
          ))}
        </div>
        <div className="hotline-row">
          {HOTLINES.map((hotline) => (
            <a key={hotline.id} href={`tel:${hotline.number}`}>
              <strong>{hotline.number}</strong>
              <span>{hotline.name}</span>
            </a>
          ))}
        </div>
      </div>
    </ChapterShell>
  );
}

const LIMITS = [
  {
    title: '공표되지 않은 데이터',
    text: '부산의 성별×연령 고독사 교차표가 없어 H3는 검증불가로 남겼습니다.',
  },
  {
    title: '서로 다른 조사 기준',
    text: '독거노인 수는 인구총조사, 65세 이상 인구는 주민등록 자료를 사용했습니다.',
  },
  {
    title: '상관관계의 한계',
    text: '오래된 집과 높은 독거 비율이 함께 보여도, 오래된 집이 원인이라고 단정하지 않았습니다.',
  },
];

function ResearchChapter({ meta }: { meta: (typeof CHAPTERS)[6] }) {
  const { trend, deaths, districts, demo, sources } = useData();
  const results = useMemo(
    () => [
      judgeH1(rowsOf(trend), rowsOf(deaths)),
      judgeH2(rowsOf(districts)),
      judgeH3(rowsOf(demo)),
    ],
    [trend, deaths, districts, demo]
  );
  const [limitIndex, setLimitIndex] = useState(0);

  return (
    <ChapterShell
      meta={meta}
      light
      eyebrow="검증 가능한 결말"
      title={
        <>
          맞춘 가설보다
          <br />
          <em>지킨 기준</em>을 남깁니다.
        </>
      }
      description={
        <>
          데이터가 결론을 계산하고, 빈칸과 한계도 숨기지 않았습니다.
          <br />
          한계 목록을 눌러 연구가 못 한 것까지 확인하세요.
        </>
      }
    >
      <div className="research-panel">
        <div className="verdict-grid">
          {results.map((result) => (
            <article key={result.id}>
              <span>{result.id}</span>
              <strong>{result.verdict}</strong>
              <p>{result.title}</p>
            </article>
          ))}
        </div>
        <div className="research-bottom">
          <div className="limits-tabs">
            {LIMITS.map((item, index) => (
              <button
                type="button"
                key={item.title}
                className={limitIndex === index ? 'is-active' : ''}
                onClick={() => setLimitIndex(index)}
              >
                {String(index + 1).padStart(2, '0')} {item.title}
              </button>
            ))}
          </div>
          <motion.div
            key={limitIndex}
            className="limit-copy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>RESEARCH LIMIT {String(limitIndex + 1).padStart(2, '0')}</span>
            <h2>{LIMITS[limitIndex].title}</h2>
            <p>{LIMITS[limitIndex].text}</p>
          </motion.div>
        </div>
        <footer className="research-footer">
          <span>부산정보영재교육원 · 중학교 2학년</span>
          <strong>검증된 출처 {rowsOf(sources).length}개</strong>
          <span>김동윤 · 박찬우 · 이연우 · 이선호</span>
        </footer>
      </div>
    </ChapterShell>
  );
}

const SLIDES = [
  WindowChapter,
  TrendChapter,
  DistrictChapter,
  WhoChapter,
  FamilyChapter,
  ActionChapter,
  ResearchChapter,
] as const;

function ChapterMenu({
  current,
  onSelect,
  onClose,
}: {
  current: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="chapter-menu"
      role="dialog"
      aria-modal="true"
      aria-label="전체 챕터"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="chapter-menu__panel"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>BUSAN ALONE · SEASON 01</span>
            <h2>전체 챕터</h2>
          </div>
          <button type="button" aria-label="챕터 메뉴 닫기" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="chapter-menu__grid">
          {CHAPTERS.map((chapter, index) => (
            <button
              type="button"
              key={chapter.id}
              className={current === index ? 'is-active' : ''}
              onClick={() => onSelect(index)}
              style={{ '--chapter-accent': chapter.accent } as React.CSSProperties}
            >
              <span>{chapter.number}</span>
              <i aria-hidden />
              <small>{chapter.kicker}</small>
              <strong>{chapter.title}</strong>
              <em>{current === index ? '지금 보는 중' : '바로 보기'} →</em>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ChapterDeck() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    const initial = CHAPTERS.findIndex((chapter) => chapter.id === hash);
    return initial >= 0 ? initial : 0;
  });
  const [direction, setDirection] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, next));
      if (clamped === index) return;
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
      setMenuOpen(false);
      window.history.replaceState(null, '', `#${CHAPTERS[clamped].id}`);
    },
    [index]
  );

  useEffect(() => {
    document.body.classList.add('deck-mode');
    return () => document.body.classList.remove('deck-mode');
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) {
        if (event.key === 'Escape' && menuOpen) setMenuOpen(false);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === 'Enter') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(CHAPTERS.length - 1);
      } else if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, menuOpen]);

  const Slide = SLIDES[index] as unknown as (props: { meta: never }) => ReactNode;
  const chapter = CHAPTERS[index];

  return (
    <div
      className={`chapter-deck ${index >= 4 ? 'is-light' : ''}`}
      onWheel={(event) => event.preventDefault()}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        if (!touchStart.current) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.current.x;
        const dy = touch.clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          goTo(index + (dx < 0 ? 1 : -1));
        }
      }}
    >
      <header className="deck-header">
        <button type="button" className="deck-brand" onClick={() => goTo(0)}>
          <span>BUSAN</span>
          <strong>ALONE</strong>
        </button>
        <div className="deck-header__meta">
          <span>DATA STORY · SEASON 01</span>
          <strong>{chapter.title}</strong>
        </div>
        <button type="button" className="deck-menu-button" onClick={() => setMenuOpen(true)}>
          <span aria-hidden>▦</span> 전체 챕터
        </button>
      </header>

      <nav className="deck-progress" aria-label="챕터 진행 상황">
        {CHAPTERS.map((item, itemIndex) => (
          <button
            type="button"
            key={item.id}
            onClick={() => goTo(itemIndex)}
            className={itemIndex === index ? 'is-active' : itemIndex < index ? 'is-past' : ''}
            aria-label={`${item.number}. ${item.title}`}
            aria-current={itemIndex === index ? 'step' : undefined}
          >
            <i />
            <span>{item.number}</span>
          </button>
        ))}
      </nav>

      <main className="deck-stage">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={chapter.id}
            className="deck-motion"
            custom={direction}
            initial={{
              opacity: reduced ? 1 : 0,
              x: reduced ? 0 : direction * 90,
              scale: reduced ? 1 : 0.985,
            }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{
              opacity: reduced ? 1 : 0,
              x: reduced ? 0 : direction * -70,
              scale: reduced ? 1 : 0.99,
            }}
            transition={{ duration: reduced ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <Slide meta={chapter as never} />
          </motion.div>
        </AnimatePresence>
      </main>

      <button
        type="button"
        className="deck-arrow deck-arrow--prev"
        disabled={index === 0}
        onClick={() => goTo(index - 1)}
        aria-label="이전 챕터"
      >
        <Arrow direction="left" />
      </button>
      <button
        type="button"
        className="deck-arrow deck-arrow--next"
        disabled={index === CHAPTERS.length - 1}
        onClick={() => goTo(index + 1)}
        aria-label="다음 챕터"
      >
        <Arrow direction="right" />
      </button>

      <footer className="deck-footer">
        <div>
          <span>{chapter.kicker}</span>
          <strong>
            {chapter.number} / {String(CHAPTERS.length - 1).padStart(2, '0')}
          </strong>
        </div>
        <p>
          <span className="desktop-only">← → 키로 챕터 이동</span>
          <span className="mobile-only">좌우로 밀어 챕터 이동</span>
        </p>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === CHAPTERS.length - 1}>
          {index === CHAPTERS.length - 1 ? 'THE END' : '다음 챕터'}
          {index < CHAPTERS.length - 1 && <Arrow direction="right" />}
        </button>
      </footer>

      <AnimatePresence>
        {menuOpen && (
          <ChapterMenu current={index} onSelect={goTo} onClose={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
