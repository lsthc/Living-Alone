import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Toss(TDS Mobile) 색 토큰 ────────────────────────────
        // 토큰 이름은 원래 디자인(산복도로 창문 6색)의 것을 유지하고 값만 TDS 로 바꿨다.
        // 원본 값은 _backup/original-index-2026-07-28/ 에 있다.
        ink: '#191f28', //   TDS foreground — 어두운 배경(Ch0~3), 흰 배경 위 본문 텍스트
        slate: '#4e5968', // TDS body — 격자선·테두리·비활성
        lamp: '#3182f6', //  TDS primary — 부산·강조·상호작용
        tide: '#8b95a1', //  TDS muted — 전국 평균·비교선
        paper: '#ffffff', // TDS canvas — Chapter 4 이후 배경, 어두운 배경 위 텍스트
        rust: '#e42939', //  TDS danger — 위험·경고. 극히 절제해서만
        // 흰 배경 위 작은 글자용 진한 danger. TDS 팔레트에는 어두운 빨강이 없어
        // WCAG AA(4.5:1)를 맞추려고 danger 를 어둡게 만든 이 페이지 한정 확장이다 (5.5:1).
        rustdeep: '#c11d2b',
        // toss.im weak CTA 쌍 — 흰 배경 위 배지·강조 라벨용 (#1b64da 는 흰 배경에서 6.8:1)
        weakbg: '#e8f3ff',
        weakfg: '#1b64da',
      },
      fontFamily: {
        // Toss Product Sans 는 재배포 근거가 없어 번들하지 않는다.
        // 설치된 기기에서는 그쪽이 먼저 잡히고, 아니면 로컬 번들 Pretendard 로 내려간다.
        sans: ['"Toss Product Sans"', 'Pretendard', 'system-ui', 'sans-serif'],
        serif: ['"Toss Product Sans"', 'Pretendard', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      // TDS 반경 스케일에 맞춘다: rounded-md 6px(문서 md), rounded-lg 16px(버튼 xlarge·카드)
      borderRadius: {
        md: '6px',
        lg: '16px',
      },
      // 프로젝터(1920×1080) 뒷줄까지 읽히도록 큰 제목 단계를 따로 둔다.
      // 최솟값은 폰(375px) 기준 — 한 줄에 6~8자는 들어가야 한글 제목이 어색하게 꺾이지 않는다.
      fontSize: {
        display: ['clamp(2.1rem, 6vw, 5.5rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        headline: ['clamp(1.5rem, 3.2vw, 3rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
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
