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

// ── Lenis 를 파일째 끼워 넣는다.
// 따로 부르면 요청이 하나 더 늘고, 발표장 회선에서는 그 왕복이 글꼴보다 비쌀 수 있다.
// 대시보드와 달리 이 페이지는 번들러를 쓰지 않으므로 node_modules 에서 직접 읽는다.
const LENIS_SRC = path.resolve('node_modules/lenis/dist/lenis.min.js');
const lenisJs = fs
  .readFileSync(LENIS_SRC, 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/m, '') // 같이 올리지 않는 파일이라 참조를 지운다
  .trim();
const lenisVersion = JSON.parse(fs.readFileSync(path.resolve('node_modules/lenis/package.json'), 'utf8')).version;

/*
 * 스타일 — Lux 디자인 시스템 (Lux/apps/web)
 *
 * 이 페이지와 대시보드(index.html)는 같은 디자인 시스템을 쓴다. QR 로 들어온 학부모가
 * 두 화면을 오갈 때 같은 앱처럼 느껴져야 하기 때문이다. Lux 쪽은 Tailwind 로 토큰을
 * 주입하지만 이 페이지는 번들러 없이 도는 단일 HTML 이라, 같은 값을 CSS 변수로 그대로 옮겼다.
 *
 * Lux 에서 그대로 가져온 것
 *   · 색 토큰 — apps/web/src/styles/tokens.css 의 값 그대로. 다크 전용이고 라이트 테마가 없다.
 *   · 층 쌓기 — 그림자를 쓰지 않는다. bg(#101116) → surface(#1a1c22) → elevated(#23262e)
 *     세 단계의 평면 색상 레이어링으로만 깊이를 낸다.
 *   · 타이포 스케일 — h1 36/54·700, h2 30/45·600, h3 24/36·600, h4 22/33·600,
 *     body 16/24, body-sm 14/21. 640px 아래에서 h1·h2 를 한 단계 줄이는 규칙까지 같다.
 *   · 반경 스케일 — sm 4 / md 6 / btn 10 / btn-lg 14 / btn-xl 16.
 *   · 버튼 — variant(fill·weak) × size(large 48px·xlarge 56px). 주 동선은 xlarge.
 *   · 히어로 — elevated → surface 세로 그라디언트에 반경 btn-xl (apps/web/src/pages/Home.tsx).
 *   · 헤더/푸터 — sticky 헤더 + bg 90% 반투명 + backdrop-blur, 푸터는 링크 줄 + 안내문.
 *
 * 이 페이지 한정으로 더한 것
 *   · 파랑은 상호작용에만 쓴다. 큰 숫자는 장식이 아니라 정보라서 foreground 로 둔다.
 *   · 글꼴은 이 페이지에 실제로 쓰인 글자만 남긴 Pretendard 서브셋. 발표장 회선 때문이다.
 *   · transition 값(모션 토큰)은 Lux 에 정의가 없어 여기서 정했다.
 */
const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>혼자 남겨진 도시, 부산 — 발표 안내</title>
<meta name="description" content="${LAST}년 부산의 독거노인은 ${comma(aloneBusan)}명입니다. 부산정보영재교육원 중학교 2학년 칠면조 팀의 독거노인·고독사 데이터 연구 발표 안내."/>
<meta name="theme-color" content="#101116"/>
<meta name="color-scheme" content="dark"/>
<meta property="og:title" content="혼자 남겨진 도시, 부산"/>
<meta property="og:description" content="${LAST}년 부산의 독거노인 ${comma(aloneBusan)}명. 중학교 2학년 네 명이 공공데이터로 확인한 것과, 끝내 확인하지 못한 것."/>
<meta property="og:type" content="website"/>
<style>
  /* 이 페이지에 쓰인 글자만 남긴 서브셋. 전체 Pretendard 는 2MB 라 발표장 회선에 맞지 않는다.
     Lux 도 Pretendard 한 벌만 쓴다 — 대시보드와 글자 모양이 같아야 한 앱처럼 보인다. */
  @font-face {
    font-family: 'PretendardSubset';
    font-style: normal;
    font-weight: 300 800;
    font-display: swap;
    src: url('./fonts/pretendard-subset.woff2') format('woff2-variations');
  }

  /* Lux 토큰 (apps/web/src/styles/tokens.css) — 값 그대로 */
  :root {
    color-scheme: dark;

    --primary: #3182f6;
    --primary-hover: #2272eb;
    --on-primary: #ffffff;
    --danger: #f0505e;

    --bg: #101116;
    --surface: #1a1c22;
    --elevated: #23262e;
    --border: #2e323b;
    --foreground: #f2f4f6;
    --body: #b0b8c1;
    --muted: #6b7684;
    --weak-bg: rgba(49, 130, 246, 0.14);
    --weak-fg: #6aa6ff;
    --success: #1fc16b;
    --warning: #f5a524;

    /* 간격 스케일 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 */
    --s-xs: 4px; --s-sm: 8px; --s-md: 12px; --s-lg: 16px; --s-xl: 20px; --s-2xl: 24px; --s-3xl: 32px; --s-4xl: 40px;
    /* Lux 반경 스케일 */
    --r-sm: 4px; --r-md: 6px; --r-btn: 10px; --r-btn-lg: 14px; --r-btn-xl: 16px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; border-color: var(--border); }

  html {
    background: var(--bg);
    color: var(--foreground);
    /* iOS 입력 확대 방지: 기본 16px */
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    /* 스크롤은 그대로 되고 막대만 숨긴다 */
    scrollbar-width: none;
    /* 끝에서 튕기며 배경이 드러나는 것을 막는다. 관성 스크롤을 쓰면 튕김이 길어진다.
       발표 중 당겨서 새로고침되는 사고도 함께 막힌다. */
    overscroll-behavior-y: none;
  }
  html::-webkit-scrollbar { display: none; }

  /* Lenis 공식 권장 스타일 */
  html.lenis, html.lenis body { height: auto; }
  html.lenis.lenis-smooth { scroll-behavior: auto !important; }
  html.lenis.lenis-stopped { overflow: clip; }

  body {
    background: var(--bg);
    color: var(--foreground);
    font-family: 'PretendardSubset', -apple-system, BlinkMacSystemFont,
                 system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    /* Lux body 16 / 400 / 24px */
    font-size: 16px; font-weight: 400; line-height: 24px;
    min-height: 100vh;
    min-height: 100svh;
    display: flex; flex-direction: column;
    /* 한글은 음절 사이 어디서나 줄바꿈이 허용돼 단어가 쪼개진다. 띄어쓰기 단위를 지킨다. */
    word-break: keep-all; overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
    /* 모바일: 탭 시 회색 사각형과 300ms 지연을 없앤다 */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    overscroll-behavior-y: none;
  }

  .num { font-variant-numeric: tabular-nums; }

  /* ── Lux 레이아웃 (apps/web/src/components/Layout.tsx) ───────────
     max-w-3xl 가운데 정렬 · sticky 헤더 · flex-1 본문 · 푸터.
     노치·홈바가 있는 기기에서 내용이 가리지 않게 안전영역을 더한다. */
  .shell {
    width: 100%; max-width: 768px; margin: 0 auto;
    display: flex; flex-direction: column; flex: 1 1 auto;
  }
  .pad {
    padding-left: max(var(--s-lg), env(safe-area-inset-left));
    padding-right: max(var(--s-lg), env(safe-area-inset-right));
  }

  .topbar {
    position: sticky; top: 0; z-index: 30;
    border-bottom: 1px solid var(--border);
    background: rgba(16, 17, 22, 0.9);
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  }
  .topbar-in {
    display: flex; height: 56px; align-items: center; justify-content: space-between; gap: var(--s-md);
  }
  /* Lux 헤더 브랜드 — h4 22/33 · 700 · tracking-tight */
  .brand {
    font-size: 17px; font-weight: 700; line-height: 24px;
    letter-spacing: -0.02em; color: var(--foreground);
    text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .topbar-note { flex: none; font-size: 14px; line-height: 21px; color: var(--muted); }

  main { flex: 1 1 auto; padding-top: var(--s-2xl); padding-bottom: var(--s-2xl); }

  /* 섹션 사이 간격은 Lux Home 의 space-y-8 (32px) */
  .stack { display: flex; flex-direction: column; gap: var(--s-3xl); }

  /* ── 타이포 (Lux fontSize 토큰) ────────────────────── */
  h1 { font-size: 36px; font-weight: 700; line-height: 54px; letter-spacing: -0.02em; color: var(--foreground); }
  h2 { font-size: 24px; font-weight: 600; line-height: 36px; letter-spacing: -0.01em; color: var(--foreground); }
  @media (max-width: 640px) {
    h1 { font-size: 28px; line-height: 40px; }
    h2 { font-size: 22px; line-height: 33px; }
  }

  /* ── 히어로 (Lux Home.tsx) ─────────────────────────
     elevated → surface 세로 그라디언트 · 반경 btn-xl · p-6 (넓은 화면 p-10) */
  .hero {
    border-radius: var(--r-btn-xl);
    background: linear-gradient(to bottom, var(--elevated), var(--surface));
    padding: var(--s-2xl);
  }
  @media (min-width: 640px) { .hero { padding: var(--s-4xl); } }
  .hero h1 { margin-top: var(--s-md); }
  .lede { margin-top: var(--s-md); max-width: 34rem; color: var(--body); }
  .lede b { color: var(--foreground); font-weight: 700; }
  .team {
    margin-top: var(--s-xl); padding-top: var(--s-lg);
    border-top: 1px solid var(--border);
    font-size: 14px; line-height: 21px; color: var(--muted);
  }
  .team b { color: var(--body); font-weight: 600; }

  /* ── 배지 (Lux badge.tsx) — rounded-sm · 12/18 · 600 ── */
  .badge {
    display: inline-flex; align-items: center; border-radius: var(--r-sm);
    padding: 2px var(--s-sm); font-size: 12px; font-weight: 600; line-height: 18px;
  }
  .badge-primary { background: var(--weak-bg); color: var(--weak-fg); }
  .badge-neutral { background: var(--elevated); color: var(--body); }
  .badge-warning { background: rgba(245, 165, 36, 0.15); color: var(--warning); }
  .badge-success { background: rgba(31, 193, 107, 0.15); color: var(--success); }

  /* ── 버튼 (Lux button.tsx) — xlarge 56px / 반경 btn-xl / 17px·600 ── */
  .actions { display: flex; flex-direction: column; gap: var(--s-sm); margin-top: var(--s-2xl); }
  .btn {
    position: relative; display: flex; align-items: center; justify-content: center;
    min-height: 56px; padding: 0 var(--s-2xl); border-radius: var(--r-btn-xl);
    font-size: 17px; font-weight: 600; line-height: 24px;
    text-decoration: none; text-align: center; user-select: none;
    transition: background-color .15s ease, filter .15s ease;
  }
  .btn:active { opacity: .8; }
  .btn-fill { background: var(--primary); color: var(--on-primary); }
  .btn-fill:hover, .btn-fill:active { background: var(--primary-hover); }
  .btn-weak { background: var(--weak-bg); color: var(--weak-fg); }
  .btn-weak:hover { filter: brightness(1.1); }
  .btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .btn-sub { display: block; margin-top: 2px; font-size: 14px; font-weight: 400; line-height: 21px; opacity: .82; }
  .btn-stack { display: flex; flex-direction: column; align-items: center; }

  /* ── 섹션 머리 (Lux Home 의 mb-4 flex items-end justify-between) ── */
  .sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--s-lg); }
  .sec-more { flex: none; font-size: 14px; line-height: 21px; color: var(--weak-fg); text-decoration: none; }
  .sec-note { margin-top: var(--s-md); color: var(--body); }
  .sec-note b { color: var(--foreground); font-weight: 600; }

  /* ── 카드 (Lux card.tsx) — rounded-btn-lg · bg-surface · p-5 ── */
  .card { border-radius: var(--r-btn-lg); background: var(--surface); padding: var(--s-xl); }

  /* ── 숫자 타일 ─────────────────────────────────────
     파랑을 쓰지 않는다. 큰 숫자는 상호작용이 아니라 정보라서 foreground 로 둔다. */
  .kpis { margin-top: var(--s-lg); display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-md); }
  .kpi-wide { grid-column: span 2; }
  .kpi .k { font-size: 14px; line-height: 21px; color: var(--muted); }
  .kpi .v {
    display: block; margin-top: var(--s-sm);
    font-size: 30px; font-weight: 700; line-height: 40px;
    letter-spacing: -0.01em; color: var(--foreground); white-space: nowrap;
  }
  .kpi .v small { font-size: 18px; font-weight: 600; }
  .kpi .l { display: block; margin-top: var(--s-xs); font-size: 14px; line-height: 21px; color: var(--body); }

  /* ── 판정 (Lux Status.tsx 의 점 + 카드) ────────────── */
  .verdicts { margin-top: var(--s-lg); display: flex; flex-direction: column; gap: var(--s-md); }
  .vr-head { display: flex; align-items: center; gap: var(--s-sm); }
  .dot { width: 10px; height: 10px; border-radius: 9999px; flex: none; }
  .d-yes { background: var(--success); }
  .d-part { background: var(--warning); }
  .d-none { background: var(--muted); }
  .vq { display: block; margin-top: var(--s-md); font-size: 16px; font-weight: 600; line-height: 24px; color: var(--foreground); }
  .vw {
    display: block; margin-top: var(--s-sm);
    border-radius: var(--r-btn); background: var(--elevated);
    padding: var(--s-md) var(--s-lg); font-size: 14px; line-height: 21px; color: var(--body);
  }

  .honest {
    margin-top: var(--s-md); padding: var(--s-xl);
    background: var(--weak-bg); border-radius: var(--r-btn-lg); color: var(--weak-fg);
  }
  .honest b { color: var(--foreground); font-weight: 700; }

  /* ── 전화 (탭 대상이므로 56px 이상) ───────────────── */
  .tels { margin-top: var(--s-lg); display: flex; flex-direction: column; gap: var(--s-md); }
  .tel {
    display: flex; align-items: center; gap: var(--s-xl);
    min-height: 56px; padding: var(--s-xl);
    border-radius: var(--r-btn-lg); background: var(--surface);
    text-decoration: none; transition: background-color .15s ease;
  }
  .tel:hover, .tel:active { background: var(--elevated); }
  .tel:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  /* .tel span 처럼 넓은 선택자를 쓰면 번호 span 까지 잡아 색을 덮어쓴다.
     (요소 선택자가 섞인 .tel span 이 .n-129 보다 특이도가 높다) 그래서 전부 클래스로 지정한다. */
  .tel .n { font-size: 30px; font-weight: 700; line-height: 36px; flex: none; letter-spacing: -0.01em; }
  .tel .n-129 { color: var(--primary); }
  .tel .n-109 { color: var(--danger); }
  .tel-body { display: block; }
  .tel-body b { display: block; font-size: 16px; font-weight: 600; line-height: 24px; color: var(--foreground); }
  .tel-desc { display: block; margin-top: var(--s-xs); font-size: 14px; line-height: 21px; color: var(--body); }
  .tel-arrow { margin-left: auto; flex: none; font-size: 20px; color: var(--muted); }
  .tel-hint { margin-top: var(--s-md); font-size: 14px; line-height: 21px; color: var(--muted); }
  .tel-hint b { color: var(--foreground); font-weight: 600; }

  /* ── 마무리 ───────────────────────────────────────── */
  .rule { text-align: center; }
  .rule .cap { font-size: 14px; line-height: 21px; color: var(--muted); }
  .rule b {
    display: block; margin-top: var(--s-sm);
    font-size: 22px; font-weight: 700; line-height: 33px;
    letter-spacing: -0.01em; color: var(--foreground);
  }

  /* ── 푸터 (Lux Layout.tsx) ─────────────────────────
     border-t + 링크 줄 + 안내문. 글자는 body-sm/muted. */
  footer {
    flex: none; border-top: 1px solid var(--border);
    padding-top: var(--s-2xl);
    padding-bottom: calc(var(--s-2xl) + env(safe-area-inset-bottom));
    font-size: 14px; line-height: 21px; color: var(--muted);
  }
  .flinks { display: flex; flex-wrap: wrap; gap: var(--s-xs) var(--s-lg); }
  .flinks a { color: var(--muted); text-decoration: none; }
  .flinks a:hover { color: var(--body); }
  footer p { margin-top: var(--s-md); }
  footer b { color: var(--body); font-weight: 600; }
</style>
</head>
<body>
<div class="shell">

  <header class="topbar">
    <div class="topbar-in pad">
      <a class="brand" href="./index.html">혼자 남겨진 도시, 부산</a>
      <span class="topbar-note">발표 안내</span>
    </div>
  </header>

  <main class="pad">
  <div class="stack">

    <!-- 히어로 -->
    <section class="hero">
      <span class="badge badge-primary">부산정보영재교육원 · 중학교 2학년 · 칠면조</span>
      <h1>혼자 남겨진 도시,<br/>부산</h1>
      <p class="lede">
        ${LAST}년 부산에서 혼자 사는 65세 이상 어르신은
        <b class="num">${comma(aloneBusan)}</b>명입니다.
        저희 넷이 공공데이터로 확인한 것과, 끝내 확인하지 못한 것을 그대로 보여드립니다.
      </p>

      <div class="actions">
        <a class="btn btn-fill" href="${CANVA_VIEW}" target="_blank" rel="noopener noreferrer">
          <span class="btn-stack">발표자료 함께 보기<span class="btn-sub">지금 발표하는 슬라이드를 내 손안에서</span></span>
        </a>
        <a class="btn btn-weak" href="./index.html">
          <span class="btn-stack">데이터 직접 만져보기<span class="btn-sub">지도와 그래프를 눌러 보는 웹 대시보드</span></span>
        </a>
      </div>

      <p class="team">만든 사람 · <b>김동윤 · 박찬우 · 이연우 · 이선호</b></p>
    </section>

    <!-- 저희가 던진 질문 -->
    <section>
      <div class="sec-head">
        <h2>저희가 던진 질문</h2>
        <a class="sec-more" href="./index.html#ch1">자세히 보기</a>
      </div>
      <p class="sec-note">부산은 전국에서 가장 먼저 초고령사회에 들어선 도시입니다. 그렇다면 고립도 전국보다 빠를까요. 그리고 그것은 부산 안 어디에서 가장 심할까요.</p>

      <div class="kpis">
        <div class="card kpi kpi-wide">
          <span class="k">${LAST}년 부산 독거노인</span>
          <span class="v num">${comma(aloneBusan)}<small>명</small></span>
          <span class="l">65세 이상 1인가구</span>
        </div>
        <div class="card kpi">
          <span class="k">10만 명당 고독사</span>
          <span class="v num">${fmt(per100kBusan)}<small>명</small></span>
          <span class="l">전국 ${fmt(per100kNation)}명의 ${fmt(per100kBusan / per100kNation, 2)}배</span>
        </div>
        <div class="card kpi">
          <span class="k">가장 높은 ${topDistrict.sgg_name}</span>
          <span class="v num">${fmt(topDistrict.elderly_alone_rate, 1)}<small>%</small></span>
          <span class="l">원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}%</span>
        </div>
      </div>
    </section>

    <!-- 가설 세 개, 판정 세 개 -->
    <section>
      <div class="sec-head">
        <h2>가설 세 개, 판정 세 개</h2>
        <a class="sec-more" href="./index.html#ch6">연구 노트</a>
      </div>
      <p class="sec-note">판정 기준은 <b>데이터를 보기 전에</b> 미리 정해 코드에 박아 뒀습니다. 결과를 보고 기준을 고치면 검증이 아니라 변명이기 때문입니다.</p>

      <div class="verdicts">
        <div class="card">
          <span class="vr-head">
            <span class="dot d-part"></span>
            <span class="badge badge-warning">부분채택</span>
          </span>
          <b class="vq">부산은 전국보다 더 가파르게 고립되는가</b>
          <span class="vw">고독사 격차 ${fmt(axes[1].gap)}%p 충족 · 독거노인 ${fmt(axes[0].gap)}%p 미달</span>
        </div>
        <div class="card">
          <span class="vr-head">
            <span class="dot d-yes"></span>
            <span class="badge badge-success">채택</span>
          </span>
          <b class="vq">어디가 가장 외로운가</b>
          <span class="vw">원도심 ${fmt(oldMean, 1)}% vs 나머지 ${fmt(otherMean, 1)}% · 원도심 정의를 바꿔도 결론 유지</span>
        </div>
        <div class="card">
          <span class="vr-head">
            <span class="dot d-none"></span>
            <span class="badge badge-neutral">검증불가</span>
          </span>
          <b class="vq">누가 혼자 떠나는가</b>
          <span class="vw">부산의 성별×연령 고독사 표가 공표되지 않습니다. 추정치를 만들어 넣지 않았습니다</span>
        </div>
      </div>

      <p class="honest">
        세 개 중 온전히 확인된 것은 하나뿐입니다. 저희는 이것을 실패가 아니라 결과로 봅니다.
        공개된 데이터로 <b>알 수 없는 것이 무엇인지</b> 아는 것도 연구가 알아낸 것이라고 생각했습니다.
      </p>
    </section>

    <!-- 혼자 계신 분이 걱정된다면 -->
    <section>
      <div class="sec-head">
        <h2>혼자 계신 분이 걱정된다면</h2>
        <a class="sec-more" href="./index.html#ch5">제도 전체 보기</a>
      </div>
      <p class="sec-note">발표를 보시고 마음이 쓰이는 분이 떠오르셨다면, 이미 만들어져 있는 제도가 있습니다. 번호를 누르면 바로 걸립니다.</p>

      <div class="tels">
        <a class="tel" href="tel:129">
          <span class="n num n-129">129</span>
          <span class="tel-body"><b>보건복지상담센터</b>
          <span class="tel-desc">어떤 제도를 신청해야 할지 모를 때. 복지사각지대 상담은 24시간입니다.</span></span>
          <span class="tel-arrow" aria-hidden="true">›</span>
        </a>
        <a class="tel" href="tel:109">
          <span class="n num n-109">109</span>
          <span class="tel-body"><b>자살예방 상담전화</b>
          <span class="tel-desc">당장 위험해 보일 때. 24시간 받습니다.</span></span>
          <span class="tel-arrow" aria-hidden="true">›</span>
        </a>
      </div>

      <p class="tel-hint">
        저희가 이 연구에서 가장 뜻밖이었던 사실 하나 — <b>노인맞춤돌봄서비스는 가족이 아니어도,
        이웃도 신청할 수 있습니다.</b> 읍·면·동 행정복지센터로 가면 됩니다.
        제도 내용은 ${VERIFIED_ON} 각 기관 공식 사이트에서 직접 확인했지만, 제도는 바뀝니다. 신청 전에 129 로 한 번 더 확인해 주세요.
      </p>
    </section>

    <!-- 마무리 -->
    <section class="card rule">
      <span class="cap">저희가 이 작업에서 지킨 규칙은 하나였습니다.</span>
      <b>가설이 틀리면 틀렸다고 쓴다.</b>
    </section>

  </div>
  </main>

  <footer class="pad">
    <div class="flinks">
      <a href="./index.html">데이터 대시보드</a>
      <a href="${CANVA_VIEW}" target="_blank" rel="noopener noreferrer">발표자료</a>
      <a href="./index.html#ch6">연구 노트</a>
      <a href="tel:129">129 상담</a>
    </div>
    <p><b>출처</b> · 국가데이터처(통계청) 인구총조사·주택총조사 · 행정안전부 주민등록 인구통계 ·
    보건복지부 고독사 사망자 실태조사(2024)·${LAST}년 고독사 발생 현황(2025) · 통계청 센서스용 행정구역경계.
    전체 목록과 원자료 링크는 대시보드 마지막 장에 있습니다.</p>
    <p><b>판정 기준은 분석 전에 등록했습니다</b> — ${BASE}년부터의 연평균 증가율 격차 1%p.
    그래서 첫 번째 가설은 채택이 아니라 부분채택입니다.</p>
    <p>이 페이지의 모든 숫자는 위 원자료에서 자동으로 계산됩니다. 손으로 옮겨 적은 숫자는 하나도 없습니다.</p>
  </footer>

</div>

<!-- Lenis ${lenisVersion} — 스무스 스크롤. 별도 요청 없이 파일째 끼워 넣었다. -->
<script>${lenisJs}</script>
<script>
(function () {
  // 모션을 줄이도록 설정한 사람에게는 켜지 않는다. 대시보드와 같은 원칙이다.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof Lenis === 'undefined') return; // 스크립트가 없어도 네이티브 스크롤로 동작해야 한다

  var lenis = new Lenis({
    duration: 1.1,
    easing: function (t) { return 1 - Math.pow(1 - t, 3); },
    smoothWheel: true
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();
</script>
</body>
</html>`;

const OUT = path.resolve('public/welcome.html');
fs.writeFileSync(OUT, html, 'utf8');

// ── 글꼴 서브셋 — 이 페이지에 실제로 쓰인 글자만 남긴다
const SRC_FONT = path.resolve('public/fonts/Pretendard.woff2');
const OUT_FONT = path.resolve('public/fonts/pretendard-subset.woff2');
// 화면에 그려지는 글자만 모은다. script·style 안의 코드는 렌더링되지 않으므로 제외한다.
const visibleText = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');
const chars = [...new Set(visibleText.replace(/\s+/g, ''))].join('');

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

const totalKb = Buffer.byteLength(html, 'utf8') / 1024;
const lenisKb = Buffer.byteLength(lenisJs, 'utf8') / 1024;
console.log(
  `public/welcome.html 생성 — ${totalKb.toFixed(1)}KB ` +
    `(그중 Lenis ${lenisVersion} 인라인 ${lenisKb.toFixed(1)}KB)`
);
console.log(`  독거노인 ${comma(aloneBusan)} · 10만명당 ${fmt(per100kBusan)}(전국 ${fmt(per100kNation)}) · ${topDistrict.sgg_name} ${fmt(topDistrict.elderly_alone_rate, 1)}%`);
console.log(`  H1 ${axes.map((a) => `${a.label} ${fmt(a.gap)}%p ${a.pass ? '충족' : '미달'}`).join(' / ')}`);
console.log(`  발표자료 ${CANVA_VIEW}`);
