import animate from 'tailwindcss-animate';

/**
 * 색·타이포·반경은 Lux(apps/web)의 디자인 시스템을 그대로 가져왔다.
 * Lux 는 다크 전용이라 이 앱도 라이트 톤(예전 Ch4~6 의 종이색 배경)을 버리고
 * 전 챕터를 같은 다크 표면 위에 올린다. 챕터 구분은 배경색 대신
 * surface / elevated 레이어와 여백으로 한다.
 *
 * 실제 색 값은 src/index.css 의 CSS 변수에서 주입한다 —
 * 차트 SVG 에서 var() 로 같은 값을 직접 쓰기 위해서다.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          fg: 'var(--on-primary)',
        },
        danger: 'var(--danger)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        foreground: 'var(--foreground)',
        body: 'var(--body)',
        muted: 'var(--muted)',
        weak: {
          bg: 'var(--weak-bg)',
          fg: 'var(--weak-fg)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        // Lux 와 같이 Pretendard 한 벌만 쓴다. 발표장 회선을 믿을 수 없어 로컬 번들.
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Lux 의 역할별 타이포 (size / line-height)
        h1: ['36px', { lineHeight: '54px', fontWeight: '700' }],
        h2: ['30px', { lineHeight: '45px', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '36px', fontWeight: '600' }],
        h4: ['22px', { lineHeight: '33px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '21px' }],
        // 프로젝터(1920×1080) 뒷줄까지 읽히도록 Lux 스케일 위에 두 단계를 더 얹었다.
        // 최솟값은 폰(375px) 기준 — 한 줄에 6~8자는 들어가야 한글 제목이 어색하게 꺾이지 않는다.
        display: ['clamp(2.1rem, 6vw, 5.5rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        headline: ['clamp(1.5rem, 3.2vw, 3rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        btn: '10px',
        'btn-lg': '14px',
        'btn-xl': '16px',
      },
      spacing: {
        4.5: '18px',
      },
      keyframes: {
        // Chapter 0 격자가 하나씩 켜지는 모션
        lampOn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        lampOn: 'lampOn 700ms ease-out forwards',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 240ms cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [animate],
};
