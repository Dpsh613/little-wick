// ---------------------------------------------------------------------------
// SVG for the little room: the static clutter behind the candle, the things
// you can pick up (papers, tea, soup) and the fire / steam / smoke layer.
// Dynamic parts are positioned imperatively by World.paint().
// ---------------------------------------------------------------------------
import { MAXF, N_PARTS, N_TONGUES, PAPER_DEFS, type PaperKind } from './world';

type RefFn = (k: string) => (el: SVGElement | null) => void;

const HAND = "'Segoe Print','Bradley Hand','Comic Sans MS','Chalkboard SE',cursive";
const CAPS = "Impact,'Arial Black','Helvetica Neue',Arial,sans-serif";
const RED = '#c4262c';

// ---- shared gradients -------------------------------------------------------
export function WorldDefs() {
  return (
    <defs>
      <radialGradient id="steamG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff8ec" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#fff1dc" stopOpacity="0.33" />
        <stop offset="100%" stopColor="#fff1dc" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="smokeG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#b8aea2" stopOpacity="0.85" />
        <stop offset="55%" stopColor="#8d857c" stopOpacity="0.38" />
        <stop offset="100%" stopColor="#8d857c" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="hotG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff0a0" stopOpacity="1" />
        <stop offset="35%" stopColor="#ff9a2a" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ff4a10" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ceramicG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d9c7a0" />
        <stop offset="35%" stopColor="#fff4da" />
        <stop offset="100%" stopColor="#cfb98d" />
      </linearGradient>
      <linearGradient id="glazeG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4a7078" />
        <stop offset="40%" stopColor="#86b3b6" />
        <stop offset="100%" stopColor="#3c6068" />
      </linearGradient>
      <linearGradient id="stickyG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffe98a" />
        <stop offset="100%" stopColor="#f4cf55" />
      </linearGradient>
      <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#8a6420" />
        <stop offset="45%" stopColor="#f1d27a" />
        <stop offset="100%" stopColor="#7a5518" />
      </linearGradient>
      <linearGradient id="silverG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f2efe8" />
        <stop offset="100%" stopColor="#a39f96" />
      </linearGradient>
      <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#bcd0e4" stopOpacity="0.35" />
        <stop offset="45%" stopColor="#f2f8ff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#8fa8c0" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  );
}

const Soft = ({ x, y, rx, ry, o = 0.5 }: { x: number; y: number; rx: number; ry: number; o?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#shadowGrad)" opacity={o} />
);

// ---- static clutter behind the candle ------------------------------------------
export function WorldBack() {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <WorldDefs />

      {/* brass chamberstick, long since burnt out */}
      <g transform="translate(424 474)">
        <Soft x={0} y={3} rx={34} ry={7} o={0.55} />
        <ellipse cx={0} cy={0} rx={27} ry={7} fill="url(#brassG)" />
        <ellipse cx={0} cy={-1.5} rx={21} ry={4.8} fill="#a07a2c" />
        <path d="M-27 0 C-30 8 -8 11 0 11 C8 11 30 8 27 0 C20 6 -20 6 -27 0Z" fill="#6f4f17" />
        <path d="M24 -2 C46 -4 46 12 24 8" fill="none" stroke="url(#brassG)" strokeWidth="4.2" strokeLinecap="round" />
        <rect x={-7} y={-22} width={14} height={20} rx={3} fill="url(#brassG)" />
        <ellipse cx={0} cy={-22} rx={8} ry={2.6} fill="#e9c969" />
        <path d="M-4 -23 L-3 -29 L3 -29 L4 -23Z" fill="#f4e6b8" />
        <line x1={0} y1={-29} x2={0.8} y2={-33} stroke="#4a3a22" strokeWidth={1.4} strokeLinecap="round" />
      </g>

      {/* ink bottle */}
      <g transform="translate(-118 468)">
        <Soft x={2} y={2} rx={22} ry={6} o={0.6} />
        <path d="M-14 0 Q-15 -20 -10 -26 L-6 -30 L6 -30 L10 -26 Q15 -20 14 0Z" fill="url(#glassG)" stroke="#e3eefa" strokeOpacity={0.4} strokeWidth={1} />
        <path d="M-12.5 -1 Q-13.4 -16 -9.4 -21 L9.4 -21 Q13.4 -16 12.5 -1Z" fill="#1d2a68" opacity={0.92} />
        <path d="M-10 -19 Q-11 -9 -10 -3" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} fill="none" strokeLinecap="round" />
        <rect x={-5} y={-38} width={10} height={9} rx={1.5} fill="url(#glassG)" />
        <rect x={-5.8} y={-43} width={11.6} height={6} rx={2} fill="#8b5a2b" />
        <rect x={-6} y={-12} width={12} height={8} rx={1} fill="#f1e4c0" opacity={0.85} />
        <ellipse cx={20} cy={4} rx={5} ry={1.8} fill="#1d2a68" opacity={0.55} />
      </g>

      {/* fountain pen */}
      <g transform="translate(-98 489) rotate(-10)">
        <Soft x={36} y={5} rx={46} ry={3.6} o={0.5} />
        <rect x={0} y={-3.8} width={50} height={7.6} rx={3.6} fill="#20202c" />
        <rect x={0} y={-3.8} width={50} height={2.4} rx={1.2} fill="#fff" opacity={0.16} />
        <rect x={40} y={-4.1} width={3.4} height={8.2} fill="#d9ac4a" />
        <rect x={50} y={-3} width={16} height={6} fill="#2c2c3a" />
        <path d="M66 -3 L80 0 L66 3Z" fill="#e8c36a" />
        <line x1={67} y1={0} x2={78} y2={0} stroke="#8a6a1e" strokeWidth={0.7} />
        <rect x={6} y={-5.4} width={2.2} height={4} rx={1} fill="#d9ac4a" />
      </g>

      {/* pencils */}
      {[
        { x: -170, y: 472, r: -7, c: '#f0b92a', d: '#d79a12' },
        { x: -162, y: 482, r: 5, c: '#4f86cf', d: '#3b6db0' },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
          <Soft x={36} y={4} rx={46} ry={3.2} o={0.5} />
          <rect x={0} y={-3.4} width={64} height={6.8} fill={p.c} />
          <rect x={0} y={-3.4} width={64} height={2} fill="#fff" opacity={0.2} />
          <rect x={0} y={1.2} width={64} height={2.2} fill={p.d} />
          <path d="M64 -3.4 L77 0 L64 3.4Z" fill="#e8c08a" />
          <path d="M73.5 -1.1 L77 0 L73.5 1.1Z" fill="#33302c" />
          <rect x={-9} y={-3.4} width={9} height={6.8} rx={2.2} fill="#e48a8f" />
          <rect x={-1.6} y={-3.4} width={3.2} height={6.8} fill="#bdbdbd" />
        </g>
      ))}

      {/* matchbox + a few matches */}
      <g transform="translate(350 494) rotate(-9)">
        <Soft x={0} y={9} rx={34} ry={6} o={0.6} />
        <rect x={-24} y={-8} width={48} height={20} rx={1.8} fill="#7d1d16" />
        <rect x={-24} y={-9} width={48} height={18} rx={1.8} fill="#b32b21" />
        <rect x={-18} y={-6} width={36} height={12} rx={1} fill="#f3e3b2" />
        <path d="M0 -4.5 C3 -1 3.4 1.8 0 4.2 C-3.4 1.8 -3 -1 0 -4.5Z" fill="#e96b1a" />
        <path d="M0 -1.2 C1.4 0.6 1.4 2 0 3 C-1.4 2 -1.4 0.6 0 -1.2Z" fill="#ffd25a" />
        <rect x={-24} y={6} width={48} height={3} fill="#4a1410" opacity={0.55} />
      </g>
      {[
        { x: 322, y: 507, r: 8 },
        { x: 334, y: 513, r: -6 },
        { x: 372, y: 508, r: 16 },
      ].map((m, i) => (
        <g key={i} transform={`translate(${m.x} ${m.y}) rotate(${m.r})`}>
          <rect x={0} y={-1} width={24} height={2} rx={1} fill="#d9b878" />
          <circle cx={25} cy={0} r={2.5} fill={i === 2 ? '#2b2420' : '#c9372c'} />
        </g>
      ))}

      {/* wax scraps near the foot */}
      {[
        { x: 368, y: 484, rx: 10, ry: 3.8, r: -8 },
        { x: 384, y: 490, rx: 5.5, ry: 2.4, r: 12 },
        { x: 34, y: 487, rx: 6, ry: 2.4, r: 4 },
      ].map((w, i) => (
        <g key={i} transform={`translate(${w.x} ${w.y}) rotate(${w.r})`}>
          <ellipse cx={0} cy={2} rx={w.rx} ry={w.ry} fill="#b48a3c" opacity={0.5} />
          <ellipse cx={0} cy={0} rx={w.rx} ry={w.ry} fill="#f5dfa0" />
          <ellipse cx={-w.rx * 0.25} cy={-w.ry * 0.3} rx={w.rx * 0.45} ry={w.ry * 0.35} fill="#fffbe8" opacity={0.8} />
        </g>
      ))}

      {/* crumpled homework */}
      <g transform="translate(-76 532)">
        <Soft x={2} y={10} rx={22} ry={6} o={0.6} />
        <path d="M-15 -2 L-9 -12 L1 -15 L11 -10 L16 0 L11 10 L0 13 L-11 9Z" fill="#eee5cf" />
        <path d="M-9 -12 L1 -15 L2 -3Z" fill="#fff8e6" />
        <path d="M2 -3 L11 -10 L16 0Z" fill="#d8ccb2" />
        <path d="M-15 -2 L2 -3 L-11 9Z" fill="#dcd0b6" />
        <path d="M2 -3 L16 0 L11 10 L0 13Z" fill="#e6dcc4" />
        <path d="M-9 -12 L2 -3 L0 13 M-15 -2 L2 -3 L16 0" stroke="#a9997a" strokeWidth={0.8} fill="none" opacity={0.7} />
        <path d="M-5 -6 L-1 -7 M4 3 L9 2 M-7 4 L-2 6" stroke="#2c3a55" strokeWidth={0.9} opacity={0.5} />
        <path d="M5 -6 L10 -5" stroke={RED} strokeWidth={1.2} opacity={0.7} />
      </g>

      {/* saucer + spoon (the cup sits on it) */}
      <g>
        <Soft x={-20} y={505} rx={70} ry={12} o={0.6} />
        <ellipse cx={-22} cy={500} rx={56} ry={12.5} fill="#e9dbb8" />
        <ellipse cx={-22} cy={498.5} rx={56} ry={12} fill="#fff4da" />
        <ellipse cx={-22} cy={499.5} rx={39} ry={8} fill="#ecdcb6" />
        <ellipse cx={-22} cy={500.5} rx={36} ry={6.8} fill="#f6e9c8" />
        <ellipse cx={-22} cy={498} rx={53} ry={10.4} fill="none" stroke="#c75d3b" strokeWidth={1.2} opacity={0.6} />
        <g transform="translate(42 509) rotate(14)">
          <ellipse cx={0} cy={3} rx={26} ry={2.4} fill="#000" opacity={0.28} />
          <rect x={-2} y={-1.4} width={36} height={2.8} rx={1.4} fill="url(#silverG)" />
          <ellipse cx={-6} cy={0} rx={8.4} ry={5.2} fill="url(#silverG)" />
          <ellipse cx={-7} cy={-0.6} rx={5} ry={2.8} fill="#cfcac0" />
        </g>
      </g>
    </g>
  );
}

// ---- paper artwork (local coords, centre origin) -----------------------------------
function Art({ kind, w, h }: { kind: PaperKind; w: number; h: number }) {
  const x0 = -w / 2;
  const y0 = -h / 2;
  switch (kind) {
    case 'test':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} rx={2} fill="#f6eedb" />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={-46} x2={46} y1={-30 + i * 9} y2={-30 + i * 9} stroke="#b9c7dc" strokeOpacity={0.5} strokeWidth={0.6} />
          ))}
          <line x1={-37} y1={y0} x2={-37} y2={-y0} stroke="#e0a0a0" strokeWidth={0.7} strokeOpacity={0.7} />
          <path d="M-50 -22 L-22 -8 L8 -24 L50 -8" stroke="#cbbd9a" strokeOpacity={0.55} fill="none" strokeWidth={0.9} />
          <path d="M-32 64 L-8 32 L18 42 L42 12" stroke="#cbbd9a" strokeOpacity={0.5} fill="none" strokeWidth={0.9} />
          <polygon points="-50,-64 -20,-64 -50,-36" fill="#fff" opacity={0.28} />
          <text x={-32} y={-52} fontSize={8} fontWeight={700} fill="#2c3a55" fontFamily={HAND}>
            MATH QUIZ #3
          </text>
          <text x={-32} y={-43} fontSize={5.6} fill="#44506b" fontFamily={HAND}>
            Name: Sam ______
          </text>
          {(
            [
              ['1) 7 × 8 = 54', -28, '56'],
              ['2) 12 ÷ 4 = 4', -15, '3'],
              ['3) 9 + 6 = 14', -2, '15'],
              ['4) √81 = 7', 11, '9'],
            ] as const
          ).map(([q, y, c], i) => (
            <g key={i}>
              <text x={-32} y={y} fontSize={6.6} fill="#2c3a55" fontFamily={HAND}>
                {q}
              </text>
              <path d={`M21 ${y - 6} L28 ${y + 1} M28 ${y - 6} L21 ${y + 1}`} stroke={RED} strokeWidth={1.6} strokeLinecap="round" />
              <text x={32} y={y} fontSize={6.4} fill={RED} fontFamily={HAND} fontWeight={700}>
                {c}
              </text>
            </g>
          ))}
          <path d="M-33 -24 q10 -4 20 0 t20 -1 M-33 -11 q12 -3 22 1" stroke={RED} strokeWidth={0.9} fill="none" opacity={0.6} />
          <g transform="translate(-9 36) rotate(-9)">
            <text x={0} y={0} textAnchor="middle" fontSize={25} fontWeight={800} fill={RED} fontFamily={HAND}>
              0/10
            </text>
            <ellipse cx={0} cy={-8} rx={26} ry={14} fill="none" stroke={RED} strokeWidth={1.5} strokeDasharray="70 8" />
          </g>
          <g transform="translate(14 53) rotate(-12)">
            <rect x={-24} y={-9} width={48} height={14} rx={1.5} fill="none" stroke={RED} strokeWidth={1.6} />
            <text x={0} y={2} textAnchor="middle" fontSize={11} fill={RED} fontFamily={CAPS} letterSpacing={1}>
              FAILED
            </text>
          </g>
          <text x={-45} y={58} fontSize={5.6} fill={RED} fontFamily={HAND} transform="rotate(-5 -45 58)">
            see me!!
          </text>
          <ellipse cx={30} cy={-46} rx={7.5} ry={7} fill="none" stroke="#8a5a2a" strokeOpacity={0.22} strokeWidth={1.6} />
        </g>
      );
    case 'dontburn':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} rx={1} fill="url(#stickyG)" />
          <polygon points={`${-x0},${-y0} ${-x0 - 15},${-y0} ${-x0},${-y0 - 15}`} fill="#e3b93e" opacity={0.8} />
          <rect x={-11} y={y0 - 3} width={22} height={9} fill="#f1ead8" opacity={0.65} transform="rotate(-4)" />
          <text x={0} y={-5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#b3201a" fontFamily={HAND}>
            DO NOT
          </text>
          <text x={0} y={14} textAnchor="middle" fontSize={15} fontWeight={800} fill="#b3201a" fontFamily={HAND}>
            BURN!!
          </text>
          <path d="M-22 18 q6 3 11 0 t11 0 t11 0 t11 0" stroke="#b3201a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'donttouch':
      return (
        <g>
          <path
            d={`M${x0} ${y0 + 3} l6 -3 l6 3 l6 -3 l6 3 l6 -3 l6 3 l6 -3 l6 3 l6 -3 l6 3 l6 -3 L${-x0} ${-y0} L${x0} ${-y0}Z`}
            fill="#f9f2e6"
          />
          <path d={`M${x0} ${-y0 - 6} L${-x0} ${-y0 - 6}`} stroke="#d8cdb8" strokeWidth={0.7} opacity={0.6} />
          <text x={0} y={-3} textAnchor="middle" fontSize={15} fontWeight={800} fill="#1f1d1b" fontFamily={HAND}>
            DON'T
          </text>
          <text x={0} y={14} textAnchor="middle" fontSize={15} fontWeight={800} fill="#1f1d1b" fontFamily={HAND}>
            TOUCH!
          </text>
          <path d="M-24 18 L24 18 M-20 21.5 L20 21.5" stroke={RED} strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    case 'reject':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} rx={1.5} fill="#f8f5ec" />
          <rect x={-34} y={-51} width={28} height={5} fill="#8a8f98" />
          <text x={-34} y={-41} fontSize={4.6} fill="#6a6f78" fontFamily={CAPS} letterSpacing={0.6}>
            NORTHWIND CO. · HIRING
          </text>
          <text x={-34} y={-27} fontSize={6} fill="#2b2b2b" fontFamily={HAND}>
            Dear Applicant,
          </text>
          {[-19, -14, -9, -4].map((y, i) => (
            <rect key={i} x={-34} y={y} width={i === 3 ? 38 : 68} height={1.8} fill="#b7b3a6" />
          ))}
          <text x={-34} y={9} fontSize={5.8} fontWeight={700} fill="#2b2b2b" fontFamily={HAND}>
            We regret to inform you
          </text>
          {[14, 19, 24].map((y, i) => (
            <rect key={i} x={-34} y={y} width={i === 2 ? 30 : 68} height={1.8} fill="#b7b3a6" />
          ))}
          <path d="M-30 46 c6 -10 8 6 12 -4 c3 -8 6 6 10 -2 c3 -6 7 3 11 -1" stroke="#2b3a6a" strokeWidth={1.1} fill="none" />
          <g transform="translate(6 36) rotate(-16)">
            <rect x={-34} y={-10} width={68} height={19} rx={2} fill="none" stroke="#a3262a" strokeWidth={2} opacity={0.88} />
            <text x={0} y={5} textAnchor="middle" fontSize={15} fill="#a3262a" opacity={0.88} fontFamily={CAPS} letterSpacing={1.2}>
              REJECTED
            </text>
          </g>
          <circle cx={26} cy={-30} r={9} fill="none" stroke="#7a4a22" strokeOpacity={0.22} strokeWidth={2} />
          <polygon points={`${-x0},${y0} ${-x0 - 18},${y0} ${-x0},${y0 + 18}`} fill="#fff" opacity={0.3} />
        </g>
      );
    case 'drawing':
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={h} rx={1.5} fill="#fbf7ea" />
          {[-34, -22, -10, 2, 14, 26, 38].map((y) => (
            <circle key={y} cx={x0 + 5} cy={y} r={1.8} fill="#cfc7b0" />
          ))}
          <text x={-30} y={-33} fontSize={8} fill="#3a3a8a" fontFamily={HAND} fontWeight={700}>
            MY CAT :)
          </text>
          <path d="M-22 6 C-30 -8 -8 -14 4 -10 C20 -12 30 0 22 12 C16 22 -16 24 -22 6Z" fill="#f0c98a" stroke="#333" strokeWidth={1.3} />
          <path d="M-18 -8 L-24 -22 L-9 -13Z M6 -11 L16 -22 L18 -8Z" fill="#f0c98a" stroke="#333" strokeWidth={1.2} />
          <circle cx={-9} cy={-3} r={2.2} fill="#333" />
          <circle cx={5} cy={-5} r={3.4} fill="#333" />
          <path d="M-2 2 L1 4 L4 1Z" fill="#e48a8f" stroke="#333" strokeWidth={0.8} />
          <path d="M-14 3 L-30 0 M-14 6 L-30 8 M10 1 L28 -3 M9 4 L27 6" stroke="#333" strokeWidth={0.9} />
          <path d="M-18 20 l-2 10 M-8 22 l1 11 M2 22 l-1 12 M12 20 l4 10 M20 15 l8 8" stroke="#333" strokeWidth={1.4} strokeLinecap="round" />
          <path d="M24 12 C38 10 40 -4 34 -12" stroke="#333" strokeWidth={1.4} fill="none" />
          <circle cx={28} cy={-30} r={6} fill="#ffd54a" stroke="#d99b1a" strokeWidth={0.8} />
          <path d="M28 -39 v-3 M37 -30 h3 M20 -36 l-2 -2 M36 -37 l2 -2" stroke="#d99b1a" strokeWidth={1} strokeLinecap="round" />
          <text x={10} y={39} fontSize={7.5} fill={RED} fontFamily={HAND} fontWeight={700} transform="rotate(-6 10 39)">
            ?? 4/10
          </text>
        </g>
      );
    case 'receipt':
      return (
        <g>
          <path
            d={`M${x0} ${y0} L${-x0} ${y0} L${-x0} ${-y0 - 4} l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 L${x0} ${-y0 - 4}Z`}
            fill="#f4f1e8"
          />
          <text x={0} y={-44} textAnchor="middle" fontSize={6.4} fontWeight={800} fill="#3a3a3a" fontFamily={CAPS} letterSpacing={0.5}>
            CAFE LUNA
          </text>
          <line x1={-16} x2={16} y1={-38} y2={-38} stroke="#777" strokeWidth={0.6} strokeDasharray="1.6 1.6" />
          {(
            [
              ['LATTE', '4.50'],
              ['PIE', '6.20'],
              ['PIE', '6.20'],
              ['TEA', '3.50'],
              ['CAKE', '9.00'],
              ['TIP', '0.00'],
            ] as const
          ).map(([n, p], i) => (
            <g key={i}>
              <text x={-16} y={-31 + i * 8} fontSize={5} fill="#444" fontFamily="monospace">
                {n}
              </text>
              <text x={16} y={-31 + i * 8} textAnchor="end" fontSize={5} fill="#444" fontFamily="monospace">
                {p}
              </text>
            </g>
          ))}
          <line x1={-16} x2={16} y1={19} y2={19} stroke="#777" strokeWidth={0.6} strokeDasharray="1.6 1.6" />
          <text x={-16} y={28} fontSize={5.8} fontWeight={700} fill="#222" fontFamily="monospace">
            TOTAL
          </text>
          <text x={16} y={28} textAnchor="end" fontSize={5.8} fontWeight={700} fill="#222" fontFamily="monospace">
            29.40
          </text>
          <text x={0} y={42} textAnchor="middle" fontSize={4.6} fill="#555" fontFamily="monospace">
            NO REFUNDS :)
          </text>
          <rect x={-14} y={47} width={28} height={7} fill="#333" opacity={0.65} />
          {[-12, -9, -6, -2, 1, 3, 7, 10].map((x) => (
            <rect key={x} x={x} y={47} width={1} height={7} fill="#f4f1e8" />
          ))}
          <ellipse cx={8} cy={-18} rx={7} ry={6.4} fill="none" stroke="#7a4a22" strokeOpacity={0.2} strokeWidth={1.6} />
        </g>
      );
  }
}

// ---- things you can pick up -------------------------------------------------------
export function WorldItems({ r }: { r: RefFn }) {
  const fr = Array.from({ length: MAXF }, (_, k) => k);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* ash left over from burnt things */}
      {PAPER_DEFS.map((d, i) => (
        <g key={`a${i}`} ref={r(`pa${i}`)} opacity={0}>
          <ellipse cx={0} cy={2} rx={d.w * 0.36} ry={d.w * 0.12} fill="#000" opacity={0.3} />
          <ellipse cx={0} cy={0} rx={d.w * 0.32} ry={d.w * 0.1} fill="#2a211b" />
          <ellipse cx={-d.w * 0.06} cy={-1} rx={d.w * 0.2} ry={d.w * 0.06} fill="#4a3f37" />
          <ellipse cx={d.w * 0.12} cy={1.2} rx={d.w * 0.1} ry={d.w * 0.035} fill="#6b5f55" opacity={0.8} />
          <path d={`M${-d.w * 0.2} 1 l5 -2 M${d.w * 0.05} 3 l6 -1 M${d.w * 0.18} -1 l4 1`} stroke="#8d8176" strokeWidth={1} opacity={0.6} />
        </g>
      ))}

      {/* paper shadows & burn glow */}
      {PAPER_DEFS.map((_, i) => (
        <ellipse key={`s${i}`} ref={r(`ps${i}`)} cx={0} cy={0} rx={1} ry={1} fill="url(#shadowGrad)" opacity={0} />
      ))}

      {/* tea & soup */}
      <ellipse ref={r('wcups')} cx={0} cy={0} rx={34} ry={6} fill="url(#shadowGrad)" opacity={0} />
      <ellipse ref={r('wbowls')} cx={0} cy={0} rx={44} ry={7} fill="url(#shadowGrad)" opacity={0} />

      <g ref={r('wcup')}>
        <ellipse ref={r('wcupg')} cx={0} cy={-26} rx={64} ry={50} fill="url(#haloGrad)" opacity={0} />
        <path d="M27 -35 C50 -38 50 -10 22 -9" fill="none" stroke="#e4d2aa" strokeWidth={6.4} strokeLinecap="round" />
        <path d="M27 -35 C48 -37 48 -11 22 -9" fill="none" stroke="#fff3d4" strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
        <path d="M-31 -44 L31 -44 C31 -20 24 0 0 0 C-24 0 -31 -20 -31 -44Z" fill="url(#ceramicG)" />
        <path d="M-30 -31 Q0 -23 30 -31" stroke="#c75d3b" strokeWidth={3} fill="none" opacity={0.9} />
        <path d="M-27 -22 Q0 -14 27 -22" stroke="#e9a35f" strokeWidth={1.6} fill="none" opacity={0.9} />
        <ellipse cx={0} cy={-44} rx={31} ry={8} fill="#fff3d6" stroke="#e1cc9f" strokeWidth={1} />
        <ellipse cx={0} cy={-43.4} rx={27} ry={6.2} fill="#a8a07e" />
        <ellipse ref={r('wcuph')} cx={0} cy={-43.4} rx={27} ry={6.2} fill="#8f4f1f" opacity={0.25} />
        <ellipse cx={-9} cy={-45} rx={9} ry={1.8} fill="#fff" opacity={0.18} />
        <ellipse cx={-17} cy={-24} rx={2.8} ry={11} fill="#fff" opacity={0.32} transform="rotate(10 -17 -24)" />
      </g>

      <g ref={r('wbowl')}>
        <ellipse ref={r('wbowlg')} cx={0} cy={-18} rx={70} ry={40} fill="url(#haloGrad)" opacity={0} />
        <path d="M-37 -26 L37 -26 C37 -6 26 0 0 0 C-26 0 -37 -6 -37 -26Z" fill="url(#glazeG)" />
        <path d="M-35 -15 Q0 -7 35 -15" stroke="#e8e0c8" strokeWidth={1.6} fill="none" opacity={0.7} />
        <ellipse cx={0} cy={-26} rx={37} ry={8} fill="#9cc3c6" stroke="#6f9a9e" strokeWidth={1} />
        <ellipse cx={0} cy={-25.6} rx={33} ry={6.4} fill="#9a8a62" />
        <ellipse ref={r('wbowlh')} cx={0} cy={-25.6} rx={33} ry={6.4} fill="#e8b650" opacity={0.25} />
        <circle cx={-12} cy={-26} r={2} fill="#7aa05a" />
        <circle cx={8} cy={-24.6} r={2.2} fill="#e87f3a" />
        <circle cx={15} cy={-27} r={1.6} fill="#7aa05a" />
        <circle cx={-2} cy={-27.4} r={1.5} fill="#e87f3a" />
        <ellipse cx={-22} cy={-14} rx={2.6} ry={8} fill="#fff" opacity={0.28} transform="rotate(14 -22 -14)" />
      </g>

      {/* papers */}
      {PAPER_DEFS.map((_d, i) => (
        <ellipse key={`g${i}`} ref={r(`pg${i}`)} cx={0} cy={0} rx={1} ry={1} fill="url(#haloGrad)" opacity={0} />
      ))}
      <g>
        {PAPER_DEFS.map((d, i) => (
          <g key={i} ref={r(`p${i}`)} transform={`translate(${d.x} ${d.y}) scale(1 ${0.4}) rotate(${(d.rot * 57.3).toFixed(1)})`}>
            <g mask={`url(#pm${i})`}>
              <Art kind={d.kind} w={d.w} h={d.h} />
              <g clipPath={`url(#pc${i})`}>
                <rect ref={r(`pd${i}`)} x={-d.w / 2} y={-d.h / 2} width={d.w} height={d.h} fill="#2a1405" opacity={0} />
                <circle ref={r(`ph${i}`)} cx={0} cy={0} r={1} fill="url(#hotG)" opacity={0} />
                {fr.map((k) => (
                  <path key={k} ref={r(`char${i}_${k}`)} d="" fill="#1c0e05" opacity={0.93} />
                ))}
              </g>
            </g>
            <g ref={r(`rings${i}`)} clipPath={`url(#pc${i})`} mask={`url(#pr${i})`} opacity={0}>
              {fr.map((k) => (
                <g key={k}>
                  <path ref={r(`glow${i}_${k}`)} d="" fill="none" stroke="#ff7a18" strokeWidth={9} strokeOpacity={0.35} strokeLinejoin="round" />
                  <path ref={r(`core${i}_${k}`)} d="" fill="none" stroke="#ffcf5e" strokeWidth={2.6} strokeLinejoin="round" />
                </g>
              ))}
            </g>
            <defs>
              <clipPath id={`pc${i}`}>
                <rect x={-d.w / 2} y={-d.h / 2} width={d.w} height={d.h} />
              </clipPath>
              <mask id={`pm${i}`} maskUnits="userSpaceOnUse" x={-d.w} y={-d.h} width={d.w * 2} height={d.h * 2}>
                <rect x={-d.w} y={-d.h} width={d.w * 2} height={d.h * 2} fill="#fff" />
                {fr.map((k) => (
                  <path key={k} ref={r(`hole${i}_${k}`)} d="" fill="#000" />
                ))}
              </mask>
              <mask id={`pr${i}`} maskUnits="userSpaceOnUse" x={-d.w} y={-d.h} width={d.w * 2} height={d.h * 2}>
                <rect x={-d.w} y={-d.h} width={d.w * 2} height={d.h * 2} fill="#fff" />
                {fr.map((k) => (
                  <path key={k} ref={r(`holeS${i}_${k}`)} d="" fill="#000" />
                ))}
              </mask>
            </defs>
          </g>
        ))}
      </g>
    </g>
  );
}

// ---- fire, steam, smoke, ash --------------------------------------------------------
export function WorldFx({ r }: { r: RefFn }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {Array.from({ length: N_TONGUES }, (_, i) => (
        <g key={i} ref={r(`tg${i}`)} opacity={0}>
          <path ref={r(`tgo${i}`)} d="" fill="url(#flameOut)" />
          <path ref={r(`tgm${i}`)} d="" fill="url(#flameMidG)" />
        </g>
      ))}
      {Array.from({ length: N_PARTS }, (_, i) => (
        <ellipse key={i} ref={r(`pt${i}`)} cx={0} cy={0} rx={1} ry={1} fill="url(#steamG)" opacity={0} />
      ))}
    </g>
  );
}
