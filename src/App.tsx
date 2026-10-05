import { useCallback, useEffect, useRef, useState } from 'react';
import Background from './scene/Background';
import Candle from './creature/Candle';
import { setAudioEnabled } from './audio';

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lumRef = useRef(1);
  const [hint, setHint] = useState(false);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    const seen = typeof localStorage !== 'undefined' && localStorage.getItem('candle.met') === '1';
    if (seen) return;
    const t = window.setTimeout(() => setHint(true), 2200);
    return () => window.clearTimeout(t);
  }, []);

  const onLight = useCallback((v: number) => {
    const lum = Math.max(0.25, Math.min(1.5, 0.45 + v * 0.62));
    if (Math.abs(lum - lumRef.current) > 0.012) {
      lumRef.current = lum;
      rootRef.current?.style.setProperty('--lum', lum.toFixed(3));
    }
  }, []);

  const onFirstInteract = useCallback(() => {
    setHint(false);
    try {
      localStorage.setItem('candle.met', '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setAudioEnabled(sound);
  }, [sound]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-[#060301] select-none"
      style={{ ['--lum' as string]: '1', touchAction: 'none' }}
    >
      <Background />

      {/* the little one */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '5vh',
          width: 'min(100vw, 1100px)',
          height: 'min(84vh, 780px)',
        }}
      >
        <Candle onLight={onLight} onFirstInteract={onFirstInteract} />
      </div>

      {/* the only words in the whole place */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center"
        style={{ bottom: '4.5vh' }}
      >
        <span
          className="text-[13px] tracking-[0.3em] text-amber-100/70 uppercase"
          style={{
            fontFamily: 'ui-rounded, "Nunito", system-ui, sans-serif',
            textShadow: '0 0 18px rgba(255,170,70,0.5)',
            opacity: hint ? 0.68 : 0,
            animation: hint ? 'hintIn 1.4s ease-out, hintBob 3.6s ease-in-out infinite 1.4s' : undefined,
            transition: 'opacity 700ms ease',
          }}
        >
          go on, poke me
        </span>
      </div>

      {/* whisper-quiet sound toggle */}
      <button
        onClick={() => setSound((s) => !s)}
        aria-label={sound ? 'mute' : 'unmute'}
        className="absolute right-4 bottom-4 h-9 w-9 rounded-full text-amber-200/35 transition hover:text-amber-200/80"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5 9.5h3l4-3v11l-4-3H5z" />
          {sound ? (
            <>
              <path d="M16 9.6a3.4 3.4 0 0 1 0 4.8" />
              <path d="M18.4 7.2a6.8 6.8 0 0 1 0 9.6" opacity="0.6" />
            </>
          ) : (
            <path d="M16.5 10l4 4m0-4l-4 4" />
          )}
        </svg>
      </button>
    </div>
  );
}
