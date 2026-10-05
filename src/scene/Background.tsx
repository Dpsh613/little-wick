const DUST = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 30 + ((i * 53) % 60),
  d: 9 + ((i * 7) % 11),
  delay: (i * 1.7) % 12,
  s: 1 + ((i * 3) % 4) * 0.5,
}));

function MiniCandle({ scale = 1, delay = 0 }: { scale?: number; delay?: number }) {
  return (
    <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center' }}>
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: 34,
          width: 100,
          height: 100,
          background: 'radial-gradient(circle, rgba(255,186,92,0.42) 0%, rgba(255,150,40,0.14) 45%, rgba(255,140,30,0) 72%)',
          animation: `flick ${2.4 + delay}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 38,
          width: 11,
          height: 24,
          borderRadius: '50% 50% 45% 45% / 70% 70% 30% 30%',
          background: 'linear-gradient(to top,#ff9d24,#ffd887,#fffbe8)',
          filter: 'blur(0.6px)',
          animation: `flick ${1.8 + delay * 0.6}s ease-in-out infinite`,
          animationDelay: `${delay * 0.4}s`,
        }}
      />
      <div
        className="rounded-t-[10px]"
        style={{
          width: 44,
          height: 72,
          background: 'linear-gradient(100deg,#6d5329 0%,#e8cf96 20%,#f6e3b4 48%,#c9a96a 100%)',
          boxShadow: 'inset 0 -10px 18px rgba(90,55,15,0.5)',
        }}
      />
    </div>
  );
}

export default function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* room */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 62%, #2a1708 0%, #1a0e05 42%, #0c0603 78%, #060301 100%)',
        }}
      />

      {/* far shelves / blurred clutter */}
      <svg
        className="absolute inset-x-0 top-0 h-[70%] w-full opacity-70"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMax slice"
        style={{ filter: 'blur(7px)' }}
      >
        <rect x="60" y="40" width="330" height="26" fill="#3a230f" />
        <rect x="820" y="90" width="320" height="24" fill="#33200e" />
        {[
          [70, 0, 7, '#5a2f1c'],
          [150, -6, 6, '#4a3a1a'],
          [230, 2, 8, '#5d421f'],
          [300, -3, 5, '#46281a'],
        ].map(([x, dy, w, c], i) => (
          <rect key={i} x={x as number} y={(40 - 90 + (dy as number)) as number} width={(w as number) * 7} height={92} rx="3" fill={c as string} />
        ))}
        {[
          [850, 0, 6, '#4b2c17'],
          [910, -8, 7, '#3f3418'],
          [980, 4, 5, '#56321a'],
          [1040, -2, 8, '#42281a'],
        ].map(([x, dy, w, c], i) => (
          <rect key={i} x={x as number} y={(90 - 96 + (dy as number)) as number} width={(w as number) * 7} height={98} rx="3" fill={c as string} />
        ))}
        <ellipse cx="620" cy="180" rx="180" ry="150" fill="#3b2410" opacity="0.5" />
        <ellipse cx="180" cy="300" rx="130" ry="120" fill="#2e1d0d" opacity="0.6" />
      </svg>

      {/* background candles, right side */}
      <div className="absolute" style={{ right: '9%', bottom: '38%', filter: 'blur(2.2px)' }}>
        <MiniCandle scale={1.25} delay={0.6} />
      </div>
      <div className="absolute" style={{ right: '20%', bottom: '41%', filter: 'blur(3.4px)', opacity: 0.8 }}>
        <MiniCandle scale={0.85} delay={1.4} />
      </div>
      <div className="absolute" style={{ right: '3%', bottom: '26%', filter: 'blur(1.6px)', opacity: 0.9 }}>
        <MiniCandle scale={0.6} delay={0.2} />
      </div>

      {/* stack of books, left side */}
      <svg
        className="absolute"
        style={{ left: '1%', bottom: '30%', width: '30%', filter: 'blur(1.6px)' }}
        viewBox="0 0 400 230"
      >
        {[
          { y: 150, h: 36, c1: '#5b2420', c2: '#3a1512', w: 330 },
          { y: 112, h: 34, c1: '#2f4330', c2: '#1b2a1d', w: 348 },
          { y: 76, h: 32, c1: '#2d3a55', c2: '#1a2234', w: 318 },
          { y: 44, h: 28, c1: '#6a4a1e', c2: '#3f2a10', w: 300 },
        ].map((b, i) => (
          <g key={i}>
            <rect x={(360 - b.w) / 2} y={b.y} width={b.w} height={b.h} rx="5" fill={`url(#bk${i})`} />
            <rect x={(360 - b.w) / 2 + 8} y={b.y + 5} width={b.w - 16} height={b.h - 10} rx="3" fill="#e8d7a8" opacity="0.22" />
            <defs>
              <linearGradient id={`bk${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={b.c1} />
                <stop offset="100%" stopColor={b.c2} />
              </linearGradient>
            </defs>
            <rect x={(360 - b.w) / 2 + 20} y={b.y + b.h / 2 - 3} width={b.w * 0.4} height="3" fill="#d8b36a" opacity="0.5" rx="1.5" />
          </g>
        ))}
      </svg>

      {/* table surface */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '38%',
          background:
            'linear-gradient(180deg, #3b2211 0%, #5a3317 10%, #46260f 40%, #2a1608 75%, #190d04 100%)',
          boxShadow: 'inset 0 14px 34px rgba(0,0,0,0.55)',
        }}
      >
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            background:
              'repeating-linear-gradient(94deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0) 3px, rgba(255,200,130,0.12) 7px, rgba(0,0,0,0.42) 13px)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,190,110,0.5), transparent)' }}
        />
      </div>

      {/* old open book, bottom left */}
      <div
        className="absolute"
        style={{
          left: '-4%',
          bottom: '1%',
          width: '34%',
          height: '20%',
          transform: 'rotate(-5deg)',
          background: 'linear-gradient(170deg, rgba(240,216,160,0.72), rgba(186,154,96,0.45) 70%, rgba(120,90,50,0.2))',
          borderRadius: '6px 22px 10px 4px',
          filter: 'blur(1.4px)',
          boxShadow: '0 -6px 26px rgba(0,0,0,0.5)',
        }}
      />

      {/* glass jar, right */}
      <div
        className="absolute"
        style={{
          right: '2%',
          bottom: '6%',
          width: '13%',
          height: '26%',
          borderRadius: '14px 14px 20px 20px',
          background:
            'linear-gradient(100deg, rgba(255,205,130,0.18), rgba(255,180,90,0.32) 40%, rgba(120,80,30,0.16))',
          boxShadow: 'inset 0 -16px 30px rgba(255,170,70,0.25), 0 0 40px rgba(255,160,60,0.14)',
          filter: 'blur(1px)',
        }}
      />

      {/* ambient light cast by our little friend (driven by --lum) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(52% 42% at 50% 72%, rgba(255,186,96,0.30) 0%, rgba(255,150,50,0.10) 45%, rgba(255,140,40,0) 72%)',
          opacity: 'var(--lum, 1)',
          transition: 'opacity 90ms linear',
        }}
      />

      {/* dust motes */}
      {DUST.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.s * 2.2,
            height: d.s * 2.2,
            background: 'rgba(255,214,150,0.75)',
            boxShadow: '0 0 6px rgba(255,190,110,0.7)',
            animation: `dust ${d.d}s linear infinite`,
            animationDelay: `-${d.delay}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(75% 65% at 50% 55%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)' }}
      />
    </div>
  );
}
