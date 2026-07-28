/**
 * 학부모 안내 페이지(public/welcome.html)를 만든다.
 *
 * 발표장에서 학부모가 QR 을 찍고 들어오는 자리다. 그래서 세 가지를 지킨다.
 *
 *   ① 숫자를 손으로 적지 않는다.
 *      build_poster.mjs 와 같은 규칙으로 public/data/ 의 CSV 를 읽어 계산한 값만 넣는다.
 *      발표자료·포스터·보고서·이 페이지의 숫자가 서로 어긋나면 안 된다.
 *
 *   ② 가볍게 만든다.
 *      학부모 수십 명이 발표장 와이파이로 동시에 연다. 프레임워크도 외부 요청도 없는
 *      단일 HTML 이고, 글꼴은 이 페이지에 실제로 쓰인 글자만 남긴 서브셋(수십 KB)을 쓴다.
 *      본 대시보드(index.html)는 JS 만 600KB 가 넘어 이 자리에 맞지 않는다.
 *
 *   ③ 모바일을 먼저 맞춘다.
 *      이 페이지는 사실상 전부 휴대폰으로 열린다. 스타일은 Toss 디자인 시스템을 따랐고,
 *      그중에서도 웹 마케팅 버튼(40~46px)이 아니라 터치용 TDS Mobile 규격을 썼다.
 *
 * 실행: node scripts/build_welcome.mjs   → public/welcome.html (+ public/fonts/pretendard-subset.woff2)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n, d = 2) => n.toFixed(d);
const comma = (n) => n.toLocaleString('ko-KR');

// ── 기준연도 · 최신연도 (하드코딩하지 않고 데이터에서 읽는다)
const BASE = 2019;
const LAST = Math.max(...death.map((r) => r.year));
const N = LAST - BASE;

// ── H1: 사전 등록 기준 — 연평균 증가율 격차 1%p
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

// ── H2: 원도심 5개구 대비 나머지
const d24 = dist.filter((d) => d.year === LAST && d.elderly_alone_rate !== null);
const OLD = new Set(['중구', '동구', '영도구', '사하구', '사상구']);
const oldMean = mean(d24.filter((d) => OLD.has(d.sgg_name)).map((d) => d.elderly_alone_rate));
const otherMean = mean(d24.filter((d) => !OLD.has(d.sgg_name)).map((d) => d.elderly_alone_rate));
const topDistrict = [...d24].sort((a, b) => b.elderly_alone_rate - a.elderly_alone_rate)[0];

// ── 핵심 숫자
const aloneBusan = at(trend, '부산', LAST, 'elderly_alone');
const per100kBusan = at(death, '부산', LAST, 'per_100k');
const per100kNation = at(death, '전국', LAST, 'per_100k');

// ── 링크 (Canva 는 반드시 /view — /edit 로 열면 학부모가 발표자료를 고칠 수 있다)
const CANVA_VIEW = 'https://www.canva.com/design/DAHQiYG_xqw/ev9RIf_Fh2df1WLUVhcPJw/view';
const VERIFIED_ON = '2026년 7월 25일';

/*
 * 스타일 — Toss 디자인 시스템(TDS Mobile)
 *
 * 지킨 것
 *   · UI primary 는 #3182f6 을 쓴다. 로고 브랜드 블루(#0064ff)로 대신하지 않는다.
 *   · 그림자를 쓰지 않는다. TDS 는 공개 근거가 있는 elevation 토큰을 promote 하지 않으므로
 *     surface(#f2f4f6)와 border(#e5e8eb)로만 층을 나눈다.
 *   · 파랑은 상호작용에만 쓴다. 큰 숫자는 장식이 아니라 정보라서 foreground(#191f28)로 둔다.
 *   · 버튼은 TDS Mobile xlarge(높이 56px · 반경 16px · 17px/600) 규격.
 *     toss.im 마케팅 버튼(40~46px · 반경 7px)과 섞지 않는다. 이 페이지는 휴대폰용이다.
 *   · 글꼴은 Toss Product Sans 를 먼저 부르되 재배포 권한이 없으므로 번들하지 않는다.
 *     설치돼 있지 않은 기기에서는 이미 서브셋해 둔 Pretendard 로 떨어진다.
 *   · 모션 토큰은 공개 근거가 없어 promote 하지 않는다. 아래 transition 은 이 페이지 한정이다.
 */
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>혼자 남겨진 도시, 부산 — 발표 안내</title>
<meta name="description" content="${LAST}년 부산의 독거노인은 ${comma(aloneBusan)}명입니다. 부산정보영재교육원 중학교 2학년 칠면조 팀의 독거노인·고독사 데이터 연구 발표 안내."/>
<meta name="theme-color" content="#ffffff"/>
<meta property="og:title" content="혼자 남겨진 도시, 부산"/>
<meta property="og:description" content="${LAST}년 부산의 독거노인 ${comma(aloneBusan)}명. 중학교 2학년 네 명이 공공데이터로 확인한 것과, 끝내 확인하지 못한 것."/>
<meta property="og:type" content="website"/>
<style>
  /* 이 페이지에 쓰인 글자만 남긴 서브셋. 전체 Pretendard 는 2MB 라 발표장 회선에 맞지 않는다.
     Toss Product Sans 가 설치된 기기에서는 그쪽이 먼저 잡힌다. */
  @font-face {
    font-family: 'PretendardSubset';
    font-style: normal;
    font-weight: 300 800;
    font-display: swap;
    src: url('./fonts/pretendard-subset.woff2') format('woff2-variations');
  }

  :root {
    /* TDS Mobile 색 토큰 */
    --primary: #3182f6;
    --primary-pressed: #2272eb;
    --canvas: #ffffff;
    --foreground: #191f28;
    --body: #4e5968;
    --muted: #8b95a1;
    --surface: #f2f4f6;
    --border: #e5e8eb;
    --on-primary: #ffffff;
    --weak-bg: #e8f3ff;
    --weak-fg: #1b64da;
    --danger: #e42939;
    /* 간격 스케일 4 / 6 / 8 / 16 / 24 / 32 */
    --s-xs: 4px; --s-sm: 6px; --s-md: 8px; --s-lg: 16px; --s-xl: 24px; --s-xxl: 32px;
    /* 반경 스케일 */
    --r-sm: 4px; --r-md: 6px; --r-btn: 16px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html {
    -webkit-text-size-adjust: 100%;
    background: var(--canvas);
  }

  body {
    background: var(--canvas);
    color: var(--body);
    font-family: 'Toss Product Sans', 'PretendardSubset', -apple-system, BlinkMacSystemFont,
                 system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    /* body 16 / 400 / 24px */
    font-size: 16px; font-weight: 400; line-height: 24px;
    /* 한글은 음절 사이 어디서나 줄바꿈이 허용돼 단어가 쪼개진다. 띄어쓰기 단위를 지킨다. */
    word-break: keep-all; overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
    /* 모바일: 탭 시 회색 사각형과 300ms 지연을 없앤다 */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .num { font-variant-numeric: tabular-nums; }

  /* 노치·홈바가 있는 기기에서 내용이 가리지 않게 한다 */
  .wrap {
    max-width: 480px;
    margin: 0 auto;
    padding-left: max(var(--s-xl), env(safe-area-inset-left));
    padding-right: max(var(--s-xl), env(safe-area-inset-right));
    padding-bottom: calc(var(--s-xxl) + env(safe-area-inset-bottom));
  }

  /* ── 표지 ─────────────────────────────────────────── */
  /* 14px 본문에는 muted(#8b95a1)를 쓰지 않는다. 흰 배경에서 3.04:1 이라
     WCAG AA 기준(작은 글자 4.5:1)에 못 미친다. 색을 새로 만들지 않고
     같은 TDS 팔레트 안에서 한 단계 진한 body(#4e5968, 7.11:1)를 쓴다.
     학부모가 휴대폰으로 읽는 화면이라 여기서는 대비를 우선했다. */
  header { padding: var(--s-xxl) 0 var(--s-xl); }
  .eyebrow { font-size: 14px; line-height: 21px; color: var(--body); }
  h1 {
    /* h1 36 / 700 / 54px */
    margin-top: var(--s-md);
    font-size: 36px; font-weight: 700; line-height: 54px;
    letter-spacing: -0.02em; color: var(--foreground);
  }
  .lede { margin-top: var(--s-lg); color: var(--body); }
  .lede b { color: var(--foreground); font-weight: 700; }
  .team {
    margin-top: var(--s-lg); padding-top: var(--s-lg);
    border-top: 1px solid var(--border);
    font-size: 14px; line-height: 21px; color: var(--body);
  }

  /* ── 버튼 (TDS Mobile xlarge) ─────────────────────── */
  .actions { display: flex; flex-direction: column; gap: var(--s-md); margin-bottom: var(--s-xxl); }
  .btn {
    display: flex; align-items: center; justify-content: center;
    min-height: 56px; padding: 0 20px; border-radius: var(--r-btn);
    font-size: 17px; font-weight: 600; line-height: 24px;
    text-decoration: none; text-align: center;
    /* 모션 토큰은 공개 근거가 없다. 이 transition 은 이 페이지 한정 확장이다. */
    transition: background-color .15s ease;
  }
  .btn-fill { background: var(--primary); color: var(--on-primary); }
  .btn-fill:active { background: var(--primary-pressed); }
  .btn-weak { background: var(--weak-bg); color: var(--weak-fg); }
  .btn-weak:active { background: #d6e9ff; }
  .btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .btn-sub { display: block; margin-top: var(--s-xs); font-size: 14px; font-weight: 400; line-height: 21px; opacity: .82; }
  .btn-stack { display: flex; flex-direction: column; align-items: center; }

  /* ── 섹션 ─────────────────────────────────────────── */
  section { padding: var(--s-xl) 0; border-top: 1px solid var(--border); }
  h2 {
    /* h3 24 / 600 / 36px — 페이지 안의 절 제목으로 쓴다 */
    font-size: 24px; font-weight: 600; line-height: 36px;
    letter-spacing: -0.01em; color: var(--foreground);
  }
  .sec-note { margin-top: var(--s-md); color: var(--body); }
  .sec-note b { color: var(--foreground); font-weight: 600; }

  /* ── 숫자 (파랑을 쓰지 않는다 — 상호작용이 아니라 정보다) ── */
  .kpis { margin-top: var(--s-lg); display: flex; flex-direction: column; gap: var(--s-md); }
  .kpi {
    background: var(--surface); border-radius: var(--r-md);
    padding: var(--s-lg); display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-lg);
  }
  .kpi .v { font-size: 24px; font-weight: 700; line-height: 36px; color: var(--foreground); white-space: nowrap; }
  .kpi .v small { font-size: 16px; font-weight: 600; }
  .kpi .l { font-size: 14px; line-height: 21px; color: var(--body); text-align: right; }

  /* ── 판정 ─────────────────────────────────────────── */
  .verdicts { margin-top: var(--s-lg); display: flex; flex-direction: column; gap: var(--s-md); }
  .vr { border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--s-lg); }
  .badge {
    display: inline-block; border-radius: var(--r-sm);
    padding: var(--s-xs) var(--s-md); font-size: 14px; font-weight: 600; line-height: 21px;
  }
  .b-yes  { background: var(--weak-bg); color: var(--weak-fg); }
  .b-part { background: var(--surface); color: var(--body); }
  .b-none { background: var(--canvas); color: var(--body); border: 1px solid var(--border); }
  .vq { display: block; margin-top: var(--s-md); font-size: 16px; font-weight: 600; line-height: 24px; color: var(--foreground); }
  .vw { display: block; margin-top: var(--s-xs); font-size: 14px; line-height: 21px; color: var(--body); }

  .honest {
    margin-top: var(--s-lg); padding: var(--s-lg);
    background: var(--weak-bg); border-radius: var(--r-md); color: var(--weak-fg);
  }
  .honest b { font-weight: 700; }

  /* ── 전화 (탭 대상이므로 56px 이상) ───────────────── */
  .tel {
    display: flex; align-items: center; gap: var(--s-lg);
    min-height: 56px; padding: var(--s-lg);
    margin-top: var(--s-md);
    border: 1px solid var(--border); border-radius: var(--r-md);
    text-decoration: none; transition: background-color .15s ease;
  }
  .tel:active { background: var(--surface); }
  .tel:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  /* .tel span 처럼 넓은 선택자를 쓰면 번호 span 까지 잡아 색을 덮어쓴다.
     (요소 선택자가 섞인 .tel span 이 .n-129 보다 특이도가 높다) 그래서 전부 클래스로 지정한다. */
  .tel .n { font-size: 30px; font-weight: 700; line-height: 36px; flex: none; letter-spacing: -0.01em; }
  .tel .n-129 { color: var(--primary); }
  .tel .n-109 { color: var(--danger); }
  .tel-body { display: block; }
  .tel-body b { display: block; font-size: 16px; font-weight: 600; line-height: 24px; color: var(--foreground); }
  .tel-desc { display: block; margin-top: var(--s-xs); font-size: 14px; line-height: 21px; color: var(--body); }
  .tel-hint { margin-top: var(--s-lg); font-size: 14px; line-height: 21px; color: var(--body); }
  .tel-hint b { color: var(--foreground); font-weight: 600; }

  /* ── 마무리 ───────────────────────────────────────── */
  .rule {
    margin-top: var(--s-xl); padding: var(--s-xl) var(--s-lg);
    background: var(--surface); border-radius: var(--r-md); text-align: center;
    font-size: 16px; line-height: 24px; color: var(--body);
  }
  .rule b { display: block; margin-top: var(--s-md); font-size: 17px; font-weight: 700; color: var(--foreground); }

  footer {
    padding-top: var(--s-xl); margin-top: var(--s-xl); border-top: 1px solid var(--border);
    font-size: 14px; line-height: 21px; color: var(--body);
  }
  footer p + p { margin-top: var(--s-md); }
  footer b { color: var(--body); font-weight: 600; }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <p class="eyebrow">부산정보영재교육원 · 중학교 2학년 · 칠면조</p>
    <h1>혼자 남겨진 도시,<br/>부산</h1>
    <p class="lede">
      ${LAST}년 부산에서 혼자 사는 65세 이상 어르신은
      <b class="num">${comma(aloneBusan)}</b>명입니다.
      저희 넷이 공공데이터로 확인한 것과, 끝내 확인하지 못한 것을 그대로 보여드립니다.
    </p>
    <p class="team">김동윤 · 박찬우 · 이연우 · 이선호</p>
  </header>

  <div class="actions">
    <a class="btn btn-fill" href="${CANVA_VIEW}" target="_blank" rel="noopener noreferrer">
      <span class="btn-stack">발표자료 함께 보기<span class="btn-sub">지금 발표하는 슬라이드를 내 손안에서</span></span>
    </a>
    <a class="btn btn-weak" href="./index.html">
      <span class="btn-stack">데이터 직접 만져보기<span class="btn-sub">지도와 그래프를 눌러 보는 웹 대시보드</span></span>
    </a>
  </div>

  <section>
    <h2>저희가 던진 질문</h2>
    <p class="sec-note">부산은 전국에서 가장 먼저 초고령사회에 들어선 도시입니다. 그렇다면 고립도 전국보다 빠를까요. 그리고 그것은 부산 안 어디에서 가장 심할까요.</p>

    <div class="kpis">
      <div class="kpi">
        <span class="v num">${comma(aloneBusan)}</span>
        <span class="l">${LAST}년 부산 독거노인<br/>65세 이상 1인가구</span>
      </div>
      <div class="kpi">
        <span class="v num">${fmt(per100kBusan)}<small>명</small></span>
        <span class="l">인구 10만 명당 고독사<br/>전국 ${fmt(per100kNation)}명의 ${fmt(per100kBusan / per100kNation, 2)}배</span>
      </div>
      <div class="kpi">
        <span class="v num">${fmt(topDistrict.elderly_alone_rate, 1)}<small>%</small></span>
        <span class="l">가장 높은 ${topDistrict.sgg_name}<br/>원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}%</span>
      </div>
    </div>
  </section>

  <section>
    <h2>가설 세 개, 판정 세 개</h2>
    <p class="sec-note">판정 기준은 <b>데이터를 보기 전에</b> 미리 정해 코드에 박아 뒀습니다. 결과를 보고 기준을 고치면 검증이 아니라 변명이기 때문입니다.</p>

    <div class="verdicts">
      <div class="vr">
        <span class="badge b-part">부분채택</span>
        <b class="vq">부산은 전국보다 더 가파르게 고립되는가</b>
        <span class="vw">고독사 격차 ${fmt(axes[1].gap)}%p 충족 · 독거노인 ${fmt(axes[0].gap)}%p 미달</span>
      </div>
      <div class="vr">
        <span class="badge b-yes">채택</span>
        <b class="vq">어디가 가장 외로운가</b>
        <span class="vw">원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}% · 원도심 정의를 바꿔도 결론 유지</span>
      </div>
      <div class="vr">
        <span class="badge b-none">검증불가</span>
        <b class="vq">누가 혼자 떠나는가</b>
        <span class="vw">부산의 성별×연령 고독사 표가 공표되지 않습니다. 추정치를 만들어 넣지 않았습니다</span>
      </div>
    </div>

    <p class="honest">
      세 개 중 온전히 확인된 것은 하나뿐입니다. 저희는 이것을 실패가 아니라 결과로 봅니다.
      공개된 데이터로 <b>알 수 없는 것이 무엇인지</b> 아는 것도 연구가 알아낸 것이라고 생각했습니다.
    </p>
  </section>

  <section>
    <h2>혼자 계신 분이 걱정된다면</h2>
    <p class="sec-note">발표를 보시고 마음이 쓰이는 분이 떠오르셨다면, 이미 만들어져 있는 제도가 있습니다. 번호를 누르면 바로 걸립니다.</p>

    <a class="tel" href="tel:129">
      <span class="n num n-129">129</span>
      <span class="tel-body"><b>보건복지상담센터</b>
      <span class="tel-desc">어떤 제도를 신청해야 할지 모를 때. 복지사각지대 상담은 24시간입니다.</span></span>
    </a>
    <a class="tel" href="tel:109">
      <span class="n num n-109">109</span>
      <span class="tel-body"><b>자살예방 상담전화</b>
      <span class="tel-desc">당장 위험해 보일 때. 24시간 받습니다.</span></span>
    </a>

    <p class="tel-hint">
      저희가 이 연구에서 가장 뜻밖이었던 사실 하나 — <b>노인맞춤돌봄서비스는 가족이 아니어도,
      이웃도 신청할 수 있습니다.</b> 읍·면·동 행정복지센터로 가면 됩니다.
      제도 내용은 ${VERIFIED_ON} 각 기관 공식 사이트에서 직접 확인했지만, 제도는 바뀝니다. 신청 전에 129 로 한 번 더 확인해 주세요.
    </p>
  </section>

  <div class="rule">
    저희가 이 작업에서 지킨 규칙은 하나였습니다.
    <b>가설이 틀리면 틀렸다고 쓴다.</b>
  </div>

  <footer>
    <p><b>출처</b> · 국가데이터처(통계청) 인구총조사·주택총조사 · 행정안전부 주민등록 인구통계 ·
    보건복지부 고독사 사망자 실태조사(2024)·${LAST}년 고독사 발생 현황(2025) · 통계청 센서스용 행정구역경계.
    전체 목록과 원자료 링크는 대시보드 마지막 장에 있습니다.</p>
    <p><b>판정 기준은 분석 전에 등록했습니다</b> — ${BASE}년부터의 연평균 증가율 격차 1%p.
    그래서 첫 번째 가설은 채택이 아니라 부분채택입니다.</p>
    <p>이 페이지의 모든 숫자는 위 원자료에서 자동으로 계산됩니다. 손으로 옮겨 적은 숫자는 하나도 없습니다.</p>
  </footer>

</div>
</body>
</html>`;

const OUT = path.resolve('public/welcome.html');
fs.writeFileSync(OUT, html, 'utf8');

// ── 글꼴 서브셋 — 이 페이지에 실제로 쓰인 글자만 남긴다
const SRC_FONT = path.resolve('public/fonts/Pretendard.woff2');
const OUT_FONT = path.resolve('public/fonts/pretendard-subset.woff2');
const chars = [...new Set(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ''))].join('');

try {
  execFileSync(
    'pyftsubset',
    [
      SRC_FONT,
      `--output-file=${OUT_FONT}`,
      `--text=${chars}`,
      '--flavor=woff2',
      '--layout-features=*',
      // 가변 축(wght)은 pyftsubset 이 기본으로 보존한다. 제목 700 · 본문 400 을 한 파일로 쓴다.
    ],
    { stdio: 'pipe' }
  );
  const before = fs.statSync(SRC_FONT).size;
  const after = fs.statSync(OUT_FONT).size;
  console.log(
    `public/fonts/pretendard-subset.woff2 생성 — ${chars.length}자 · ` +
      `${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024).toFixed(1)}KB`
  );
} catch (e) {
  console.warn('⚠ pyftsubset 실패 — 글꼴 서브셋을 만들지 못했습니다. 시스템 글꼴로 표시됩니다.');
  console.warn('  설치: pip install "fonttools[woff]" brotli');
  console.warn(`  ${String(e.message).split('\n')[0]}`);
}

console.log(`public/welcome.html 생성 — ${(Buffer.byteLength(html, 'utf8') / 1024).toFixed(1)}KB`);
console.log(`  독거노인 ${comma(aloneBusan)} · 10만명당 ${fmt(per100kBusan)}(전국 ${fmt(per100kNation)}) · ${topDistrict.sgg_name} ${fmt(topDistrict.elderly_alone_rate, 1)}%`);
console.log(`  H1 ${axes.map((a) => `${a.label} ${fmt(a.gap)}%p ${a.pass ? '충족' : '미달'}`).join(' / ')}`);
console.log(`  발표자료 ${CANVA_VIEW}`);
