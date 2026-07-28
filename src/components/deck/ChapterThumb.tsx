import { cn } from '@/lib/utils';

/**
 * 챕터 목록 카드의 작은 그림.
 *
 * 사진을 쓰지 않는다. 이 앱의 유일한 시각 모티프인 '창문 사각형'이
 * 챕터마다 어떤 모양으로 변형되는지를 그대로 축소해 그린다.
 * 목록만 훑어도 그 챕터에서 무엇을 보게 될지 짐작할 수 있어야 한다.
 */

const W = 300;
const H = 150;

function Squares({ lit }: { lit: number[] }) {
  const cols = 14;
  const rows = 6;
  const size = 13;
  const gap = 6;
  const gw = cols * size + (cols - 1) * gap;
  const gh = rows * size + (rows - 1) * gap;
  const x0 = (W - gw) / 2;
  const y0 = (H - gh) / 2;
  return (
    <g>
      {Array.from({ length: cols * rows }, (_, i) => (
        <rect
          key={i}
          x={x0 + (i % cols) * (size + gap)}
          y={y0 + Math.floor(i / cols) * (size + gap)}
          width={size}
          height={size}
          fill={lit.includes(i) ? 'var(--lamp)' : 'var(--slate)'}
          opacity={lit.includes(i) ? 0.9 : 0.28}
        />
      ))}
    </g>
  );
}

/** 챕터마다 다른 모티프. index 는 CHAPTERS 의 순서와 같다. */
function Motif({ id }: { id: string }) {
  switch (id) {
    // 00 창문 — 격자가 드문드문 켜진다
    case 'ch0':
      return <Squares lit={[3, 9, 17, 22, 31, 38, 44, 51, 57, 63, 70, 76]} />;

    // 01 속도 — 두 선이 벌어진다
    case 'ch1':
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 118 L88 104 L152 82 L216 52 L276 26" stroke="var(--lamp)" strokeWidth={4} />
          <path d="M24 118 L88 112 L152 102 L216 92 L276 80" stroke="var(--tide)" strokeWidth={3} strokeDasharray="7 7" />
          {[
            [24, 118],
            [88, 104],
            [152, 82],
            [216, 52],
            [276, 26],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r={3.5} fill="var(--lamp)" stroke="none" />
          ))}
        </g>
      );

    // 02 지도 — 밝기가 다른 칸들
    case 'ch2': {
      const t = [0.15, 0.85, 0.4, 0.95, 0.25, 0.6, 0.7, 0.2, 0.9, 0.35, 0.5, 0.75, 0.3, 0.65, 0.45, 0.8];
      return (
        <g>
          {t.map((v, i) => (
            <rect
              key={i}
              x={54 + (i % 4) * 48}
              y={20 + Math.floor(i / 4) * 28}
              width={42}
              height={22}
              rx={2}
              fill="var(--lamp)"
              opacity={0.18 + v * 0.78}
            />
          ))}
        </g>
      );
    }

    // 03 피라미드 — 좌우로 누운 막대
    case 'ch3': {
      const male = [30, 52, 74, 58, 36];
      const female = [22, 34, 56, 78, 92];
      return (
        <g>
          {male.map((v, i) => (
            <rect key={`m${i}`} x={146 - v} y={22 + i * 22} width={v} height={14} fill="var(--lamp)" opacity={0.75} />
          ))}
          {female.map((v, i) => (
            <rect key={`f${i}`} x={154} y={22 + i * 22} width={v} height={14} fill="var(--tide)" opacity={0.75} />
          ))}
          <line x1={146} x2={146} y1={16} y2={134} stroke="var(--slate)" strokeWidth={1} />
          <line x1={154} x2={154} y1={16} y2={134} stroke="var(--slate)" strokeWidth={1} />
        </g>
      );
    }

    // 04 우리 가족 — 격자 안의 붉은 한 칸
    case 'ch4': {
      const cols = 14;
      const rows = 6;
      const size = 13;
      const gap = 6;
      const gw = cols * size + (cols - 1) * gap;
      const gh = rows * size + (rows - 1) * gap;
      const x0 = (W - gw) / 2;
      const y0 = (H - gh) / 2;
      return (
        <g>
          {Array.from({ length: cols * rows }, (_, i) => (
            <rect
              key={i}
              x={x0 + (i % cols) * (size + gap)}
              y={y0 + Math.floor(i / cols) * (size + gap)}
              width={size}
              height={size}
              fill={i === 45 ? 'var(--rust)' : 'var(--slate)'}
              opacity={i === 45 ? 1 : 0.35}
            />
          ))}
        </g>
      );
    }

    // 05 제도 — 카드 두 장과 전화번호
    case 'ch5':
      return (
        <g>
          <rect x={26} y={30} width={118} height={90} rx={8} fill="var(--lamp)" opacity={0.14} />
          <rect x={42} y={48} width={70} height={7} rx={3.5} fill="var(--lamp)" opacity={0.65} />
          <rect x={42} y={64} width={86} height={6} rx={3} fill="var(--slate)" opacity={0.5} />
          <rect x={42} y={78} width={58} height={6} rx={3} fill="var(--slate)" opacity={0.5} />
          <text x={214} y={92} textAnchor="middle" className="font-sans" fontSize={54} fill="var(--rust)">
            129
          </text>
        </g>
      );

    // 06 연구 노트 — 판정 표
    default:
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={30} y={34 + i * 34} width={104} height={8} rx={4} fill="var(--slate)" opacity={0.5} />
              <rect
                x={150}
                y={30 + i * 34}
                width={i === 2 ? 52 : 44}
                height={16}
                rx={8}
                fill={i === 2 ? 'var(--slate)' : 'var(--lamp)'}
                opacity={i === 2 ? 0.55 : 0.35}
              />
              <rect x={216} y={34 + i * 34} width={54} height={8} rx={4} fill="var(--slate)" opacity={0.35} />
            </g>
          ))}
        </g>
      );
  }
}

export function ChapterThumb({
  id,
  tone,
  className,
}: {
  id: string;
  tone: 'dark' | 'light';
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('block h-full w-full', className)} aria-hidden>
      <rect width={W} height={H} fill={tone === 'dark' ? '#12161d' : '#f2f4f6'} />
      <Motif id={id} />
    </svg>
  );
}
