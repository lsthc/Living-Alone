/**
 * 발표회 포스터(2:3 세로)를 만든다. 레이아웃은 600×900 기준으로 짜여 있고,
 * SCALE 배수만큼 CSS transform 으로 확대해 벡터(텍스트·SVG)를 뭉개지지 않고
 * 더 높은 해상도로 캡처할 수 있게 한다.
 *
 * 포스터에 찍히는 숫자는 하나도 손으로 적지 않는다. public/data/ 의 CSV 를 읽어
 * src/lib/hypothesis.ts 와 같은 규칙으로 계산한 값만 넣는다.
 * 보고서·화면·포스터의 숫자가 서로 어긋나지 않게 하려는 것이다.
 *
 * 실행: node scripts/build_poster.mjs [scale]   → dist/_poster.html
 *   예) node scripts/build_poster.mjs 4   → 2400×3600 캡처용 HTML
 * 그 뒤 헤드리스 크롬으로 (600×scale)×(900×scale) 캡처 → PNG/JPEG.
 */
import fs from 'node:fs';
import path from 'node:path';

const SCALE = Number(process.argv[2]) || 1;
const OUT_W = 600 * SCALE;
const OUT_H = 900 * SCALE;

const DATA = path.resolve('public/data');

function readCsv(file) {
  const [head, ...lines] = fs.readFileSync(path.join(DATA, file), 'utf8').trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(
      cols.map((c, i) => {
        const v = cells[i];
        if (v === undefined || v === '') return [c, null];
        return [c, isNaN(Number(v)) ? v : Number(v)];
      })
    );
  });
}

const trend = readCsv('01_trend_national_busan.csv');
const death = readCsv('02_lonely_death_trend.csv');
const dist = readCsv('03_busan_districts.csv');

const at = (rows, region, year, key) => rows.find((r) => r.region === region && r.year === year)?.[key];
const cagr = (a, b, n) => (Math.pow(b / a, 1 / n) - 1) * 100;
const BASE = 2019;
const LAST = Math.max(...death.map((r) => r.year));
const N = LAST - BASE;

// ── H1: 사전 등록 기준 (연평균 증가율 격차 1%p)
const axes = [
  {
    label: '독거노인 수',
    b: cagr(at(trend, '부산', BASE, 'elderly_alone'), at(trend, '부산', LAST, 'elderly_alone'), N),
    n: cagr(at(trend, '전국', BASE, 'elderly_alone'), at(trend, '전국', LAST, 'elderly_alone'), N),
  },
  {
    label: '고독사 발생 수',
    b: cagr(at(death, '부산', BASE, 'deaths'), at(death, '부산', LAST, 'deaths'), N),
    n: cagr(at(death, '전국', BASE, 'deaths'), at(death, '전국', LAST, 'deaths'), N),
  },
].map((a) => ({ ...a, gap: a.b - a.n, pass: a.b - a.n >= 1 }));

// ── H2: 원도심 대비
const d24 = dist.filter((d) => d.year === LAST && d.elderly_alone_rate !== null);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const OLD = new Set(['중구', '동구', '영도구', '사하구', '사상구']);
const oldMean = mean(d24.filter((d) => OLD.has(d.sgg_name)).map((d) => d.elderly_alone_rate));
const otherMean = mean(d24.filter((d) => !OLD.has(d.sgg_name)).map((d) => d.elderly_alone_rate));
const top = [...d24].sort((a, b) => b.elderly_alone_rate - a.elderly_alone_rate).slice(0, 5);

const fmt = (n, d = 2) => n.toFixed(d);
const comma = (n) => n.toLocaleString('ko-KR');

/** 피어슨 상관 — hypothesis.ts 의 pearson() 과 같은 식. */
function pearson(xs, ys) {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}
const corrOldHousing = pearson(
  d24.map((d) => d.old_housing_rate),
  d24.map((d) => d.elderly_alone_rate)
);
const corrAging = pearson(
  d24.map((d) => d.aging_rate),
  d24.map((d) => d.elderly_alone_rate)
);

// ── 차트 ① 연평균 증가율 막대 (사전 등록 기준 대비)
function cagrChart() {
  const W = 258;
  const H = 132;
  const max = Math.max(...axes.flatMap((a) => [a.b, a.n])) * 1.25;
  const rowH = 52;
  let s = '';
  axes.forEach((a, i) => {
    const y = 16 + i * rowH;
    const bw = (a.b / max) * 168;
    const nw = (a.n / max) * 168;
    s += `<text x="0" y="${y}" fill="#EDE8DF" font-size="9.5" font-weight="600">${a.label}</text>`;
    s += `<rect x="0" y="${y + 5}" width="${bw}" height="9" fill="#FFC46B" rx="1.5"/>`;
    s += `<text x="${bw + 4}" y="${y + 13}" fill="#FFC46B" font-size="8.5" font-family="monospace">${fmt(a.b)}%</text>`;
    s += `<rect x="0" y="${y + 18}" width="${nw}" height="9" fill="#4E9AA8" rx="1.5"/>`;
    s += `<text x="${nw + 4}" y="${y + 26}" fill="#4E9AA8" font-size="8.5" font-family="monospace">${fmt(a.n)}%</text>`;
    s += `<text x="0" y="${y + 39}" font-size="8.5" font-family="monospace" fill="${a.pass ? '#FFC46B' : '#8C99A8'}">격차 ${fmt(a.gap)}%p · 기준 1%p ${a.pass ? '충족' : '미달'}</text>`;
  });
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ── 차트 ② 독거노인 비율 상위 5개 구
function topChart() {
  const W = 258;
  const H = 132;
  const max = top[0].elderly_alone_rate * 1.16;
  let s = '';
  top.forEach((d, i) => {
    const y = 10 + i * 21;
    const w = (d.elderly_alone_rate / max) * 150;
    const isOld = OLD.has(d.sgg_name);
    s += `<text x="0" y="${y + 9}" fill="#EDE8DF" font-size="9.5">${d.sgg_name}</text>`;
    s += `<rect x="34" y="${y + 1}" width="${w}" height="11" rx="1.5" fill="${isOld ? '#FFC46B' : '#4E9AA8'}"/>`;
    s += `<text x="${34 + w + 4}" y="${y + 10}" fill="${isOld ? '#FFC46B' : '#4E9AA8'}" font-size="8.5" font-family="monospace">${d.elderly_alone_rate}%</text>`;
  });
  s += `<text x="0" y="126" fill="#8C99A8" font-size="8">노랑 = 원도심 5개구 · 평균 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}%</text>`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

const VERDICTS = [
  {
    id: 'H1',
    q: '부산은 전국보다 더 가파르게 고립되는가',
    v: '부분 지지',
    tone: 'partial',
    why: `고독사 격차 ${fmt(axes[1].gap)}%p 충족 · 독거노인 ${fmt(axes[0].gap)}%p 미달`,
  },
  {
    id: 'H2',
    q: '원도심일수록 더 외로운가',
    v: '지지',
    tone: 'yes',
    why: `원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}% · 정의 바꿔도 유지`,
  },
  {
    id: 'H3',
    q: '누가 혼자 떠나는가',
    v: '검증불가',
    tone: 'none',
    why: '부산 성별×연령 교차표 미공표 · 추정치를 만들지 않았다',
  },
];

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<link rel="stylesheet" href="./fonts/fonts.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${OUT_W}px; height:${OUT_H}px; background:#0B1420; overflow:hidden; }
  #stage { width:600px; height:900px; position:relative; background:#0B1420; color:#EDE8DF;
           font-family:'Pretendard',system-ui,sans-serif; overflow:hidden;
           transform:scale(${SCALE}); transform-origin:top left; }
  .num { font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; }
  .serif { font-family:'Gowun Batang',serif; }
  header { padding:26px 30px 16px; border-bottom:1px solid rgba(237,232,223,.16); }
  h1 { font-size:37px; line-height:1.12; letter-spacing:-.02em; }
  h1 em { font-style:normal; color:#FFC46B; }
  .sub { margin-top:9px; font-size:12px; color:rgba(237,232,223,.62); line-height:1.5; }
  .team { margin-top:11px; font-size:10.5px; color:rgba(237,232,223,.5); }
  .q { margin:0 30px; padding:11px 0 10px; font-size:12.5px; color:rgba(237,232,223,.85);
       border-bottom:1px solid rgba(237,232,223,.1); }
  .q b { color:#FFC46B; font-weight:600; }
  .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; margin:0 30px;
          background:rgba(237,232,223,.1); border-bottom:1px solid rgba(237,232,223,.1); }
  .kpi { background:#0B1420; padding:12px 0 13px; }
  .kpi .v { font-size:25px; color:#FFC46B; line-height:1; }
  .kpi .v small { font-size:12px; }
  .kpi .l { margin-top:6px; font-size:9.5px; color:rgba(237,232,223,.58); line-height:1.35; }
  .charts { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:13px 30px 10px; }
  .ct { font-size:10px; color:rgba(237,232,223,.72); margin-bottom:5px; font-weight:600; }
  .verdicts { margin:0 30px; border-top:1px solid rgba(237,232,223,.1); padding-top:10px; }
  .vr { display:flex; gap:9px; align-items:flex-start; padding:5.5px 0; }
  .badge { flex:none; width:56px; text-align:center; font-size:9.5px; padding:2.5px 0; border-radius:9px; border:1px solid; }
  .yes { color:#FFC46B; border-color:rgba(255,196,107,.55); background:rgba(255,196,107,.1); }
  .partial { color:#4E9AA8; border-color:rgba(78,154,168,.6); background:rgba(78,154,168,.1); }
  .none { color:rgba(237,232,223,.6); border-color:rgba(237,232,223,.25); }
  .vq { font-size:10.5px; line-height:1.4; }
  .vq b { color:rgba(237,232,223,.95); font-weight:600; }
  .vq span { color:rgba(237,232,223,.55); }
  .ask { margin:9px 30px 0; padding:10px 12px; background:rgba(255,196,107,.07);
         border-left:2px solid #FFC46B; }
  .ask h2 { font-size:10.5px; color:#FFC46B; margin-bottom:5px; }
  .ask li { font-size:10px; line-height:1.5; color:rgba(237,232,223,.85); list-style:none; margin-bottom:2px; }
  .limits { margin:9px 30px 0; padding:10px 12px; border:1px solid rgba(237,232,223,.16); }
  .limits h2 { font-size:10px; color:rgba(237,232,223,.72); margin-bottom:5px; }
  .limits li { font-size:9.3px; line-height:1.5; color:rgba(237,232,223,.6);
               list-style:none; margin-bottom:2.5px; padding-left:8px; text-indent:-8px; }
  .limits li::before { content:'· '; color:rgba(237,232,223,.4); }
  .limits b { color:rgba(237,232,223,.85); font-weight:600; }
  footer { position:absolute; bottom:0; left:0; right:0; padding:9px 30px 12px;
           border-top:1px solid rgba(237,232,223,.14); display:flex; gap:12px; align-items:flex-end; }
  .src { flex:1; font-size:7.6px; line-height:1.5; color:rgba(237,232,223,.5); }
  .src b { color:rgba(237,232,223,.72); font-weight:600; }
  .qr { flex:none; width:58px; height:58px; border:1px dashed rgba(237,232,223,.35);
        display:flex; align-items:center; justify-content:center; text-align:center;
        font-size:7px; color:rgba(237,232,223,.45); line-height:1.3; }
</style>
</head>
<body>
<div id="stage">
  <header>
    <h1 class="serif">혼자 남겨진 도시,<br/><em>부산</em></h1>
    <p class="sub">전국에서 가장 먼저 초고령사회에 들어선 도시의 독거노인·고독사 데이터</p>
    <p class="team">부산정보영재교육원 중2 Data AI · <b>칠면조</b> · 김동윤 · 박찬우 · 이연우 · 이선호 · 지도 유근찬</p>
  </header>

  <p class="q"><b>연구 질문</b> — 부산은 정말 전국보다 빠르게 혼자가 되고 있는가, 그렇다면 어디가 가장 먼저인가</p>

  <div class="kpis">
    <div class="kpi"><div class="v num">${comma(at(trend, '부산', LAST, 'elderly_alone'))}</div>
      <div class="l">${LAST}년 부산 독거노인<br/>(65세 이상 1인가구)</div></div>
    <div class="kpi"><div class="v num">${at(death, '부산', LAST, 'per_100k')}<small> 명</small></div>
      <div class="l">10만 명당 고독사<br/>전국 ${at(death, '전국', LAST, 'per_100k')}명의 ${fmt(at(death, '부산', LAST, 'per_100k') / at(death, '전국', LAST, 'per_100k'), 2)}배</div></div>
    <div class="kpi"><div class="v num">${top[0].elderly_alone_rate}<small>%</small></div>
      <div class="l">가장 높은 ${top[0].sgg_name}<br/>가장 낮은 구의 ${fmt(top[0].elderly_alone_rate / Math.min(...d24.map((d) => d.elderly_alone_rate)), 1)}배</div></div>
  </div>

  <div class="charts">
    <div><div class="ct">① ${BASE}→${LAST} 연평균 증가율 · 부산 vs 전국</div>${cagrChart()}</div>
    <div><div class="ct">② ${LAST}년 독거노인 비율 상위 5개 구</div>${topChart()}</div>
  </div>

  <div class="verdicts">
    ${VERDICTS.map(
      (v) => `<div class="vr">
      <span class="badge ${v.tone}">${v.v}</span>
      <span class="vq"><b>${v.id}. ${v.q}</b><br/><span>${v.why}</span></span>
    </div>`
    ).join('')}
  </div>

  <div class="ask">
    <h2>그래서 무엇을 하자는 것인가</h2>
    <ul>
      <li><b>부산광역시에</b> — 고독사 예방 조례의 우선 실행 지역을 원도심 5개구부터 지정하고 안부확인 인력을 먼저 배치할 것</li>
      <li><b>보건복지부에</b> — 고독사 실태조사의 성별×연령 교차표를 시·도 단위까지 공표할 것 (H3 를 아무도 검증할 수 없다)</li>
    </ul>
  </div>

  <div class="limits">
    <h2>이 연구가 못 한 것 — 질문받기 전에 먼저 적는다</h2>
    <ul>
      <li>주택총조사 공표 구간이 10년 단위라 <b>‘준공 30년 이상’을 계산할 수 없었다.</b> 1989년 이전 준공(35년 이상)으로 대신했다.</li>
      <li>독거노인 비율은 <b>분자가 인구총조사, 분모가 주민등록</b>이라 조사 기준이 섞여 있다. 구 사이 상대 비교에만 썼다.</li>
      <li>노후주택과의 상관(r=${fmt(corrOldHousing, 2)})보다 <b>고령화율과의 상관(r=${fmt(corrAging, 2)})이 더 강하다.</b> 상관관계는 인과관계가 아니다.</li>
      <li>독거노인 2011~2014년은 인구총조사가 없어 <b>비운 채로 뒀다.</b> 앞뒤 값으로 메우지 않았다.</li>
    </ul>
  </div>

  <footer>
    <div class="src">
      <b>출처</b> 국가데이터처(통계청) 인구총조사·주택총조사, 「독거노인가구비율」「건축연도별 주택」(2024) kosis.kr ·
      행정안전부 「주민등록 인구통계」(2024) jumin.mois.go.kr ·
      보건복지부 「고독사 사망자 실태조사」(2024)·「2024년 고독사 발생 현황」(2025) mohw.go.kr ·
      통계청 「센서스용 행정구역경계」(2013)<br/>
      <b>판정 기준은 분석 전에 등록했다</b> — ${BASE}년부터의 연평균 증가율 격차 1%p. 그래서 H1 은 지지가 아니라 부분 지지다.
    </div>
    <div class="qr">QR<br/>7.28<br/>배포 후</div>
  </footer>
</div>
</body>
</html>`;

fs.mkdirSync(path.resolve('dist'), { recursive: true });
const outFile = SCALE === 1 ? 'dist/_poster.html' : `dist/_poster_${OUT_W}x${OUT_H}.html`;
fs.writeFileSync(path.resolve(outFile), html, 'utf8');
console.log(`${outFile} 생성 (캡처 크기 ${OUT_W}×${OUT_H})`);
console.log(`H1 축별 격차: ${axes.map((a) => `${a.label} ${fmt(a.gap)}%p ${a.pass ? '충족' : '미달'}`).join(' / ')}`);
console.log(`H2 원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}%`);
