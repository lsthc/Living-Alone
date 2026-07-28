import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── 연구 발표용 색상 토큰 ────────────────────────────────
        // 산복도로의 창문에서 가져온 6색. 이 밖의 색은 쓰지 않는다.
        ink: '#0B1420', //   심야 남색 — 배경
        slate: '#33465C', // 고립·비활성
        lamp: '#FFC46B', //  창문 불빛 — 부산·강조
        tide: '#4E9AA8', //  전국 평균·비교선
        paper: '#EDE8DF', // Chapter 4 이후 배경, 본문 텍스트
        rust: '#C4553F', //  원도심 강조 — 극히 절제해서만
        // 종이색 배경 위의 작은 글자용. rust 원색은 #EDE8DF 위에서 대비가 3.7:1 이라
        // 본문 크기(4.5:1 필요)에 미달한다. 큰 숫자에는 원색 rust 를 그대로 쓴다.
        rustdeep: '#A94430',
      },
      fontFamily: {
        // CDN 대신 로컬 번들 폰트를 쓴다 (발표장 오프라인 대비)
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        // 표제도 Pretendard 로 통일했다 — Gowun Batang(명조) 은 큰 글자에서 획이 가늘어져
        // 가독성이 떨어진다는 피드백을 받았다.
        serif: ['Pretendard', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      // 프로젝터(1920×1080) 뒷줄까지 읽히도록 큰 제목 단계를 따로 둔다
      fontSize: {
        display: ['clamp(2.75rem, 6vw, 5.5rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        headline: ['clamp(1.75rem, 3.2vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      keyframes: {
        // Chapter 0 격자가 하나씩 켜지는 모션
        lampOn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: { lampOn: 'lampOn 700ms ease-out forwards' },
    },
  },
  plugins: [animate],
};
