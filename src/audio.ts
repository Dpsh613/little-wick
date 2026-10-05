// Tiny, cosy WebAudio blips. Nothing loud, nothing cartoonish.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let noiseBuf: AudioBuffer | null = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.3;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setAudioEnabled(v: boolean) {
  enabled = v;
  if (master) master.gain.value = v ? 0.3 : 0;
  if (v) ensure();
}
export function audioEnabled() {
  return enabled;
}

function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', bendTo?: number) {
  const c = ensure();
  if (!c || !master || !enabled) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (bendTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, bendTo), c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + dur + 0.05);
}

function noise(dur: number, vol: number, f0: number, f1: number, q = 1) {
  const c = ensure();
  if (!c || !master || !enabled || !noiseBuf) return;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(Math.max(60, f1), c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  s.connect(f).connect(g).connect(master);
  s.start();
  s.stop(c.currentTime + dur + 0.05);
}

export function play(name: string, p = 0.6) {
  if (!enabled) return;
  const v = 0.08 + p * 0.1;
  switch (name) {
    case 'boop':
      tone(520 + p * 320, 0.1, v * 0.9, 'sine', 820 + p * 400);
      noise(0.06, v * 0.25, 900, 400, 2);
      break;
    case 'squish':
      noise(0.17, v * 0.5, 420, 160, 3);
      tone(240, 0.14, v * 0.3, 'sine', 170);
      break;
    case 'pop':
      tone(660, 0.07, v * 0.7, 'sine', 1180);
      break;
    case 'boing':
      tone(300, 0.26, v * 0.65, 'sine', 620 + p * 300);
      setTimeout(() => tone(500, 0.16, v * 0.3, 'sine', 320), 110);
      break;
    case 'whine':
      tone(430, 0.3, v * 0.5, 'sine', 300);
      setTimeout(() => tone(380, 0.34, v * 0.45, 'sine', 250), 160);
      break;
    case 'giggle':
      [0, 90, 180, 265].forEach((d, i) => setTimeout(() => tone(620 + i * 55, 0.09, v * 0.45, 'sine', 760 + i * 60), d));
      break;
    case 'puff':
      noise(0.3, v * 0.5, 1600, 300, 0.7);
      break;
    case 'relight':
      noise(0.22, v * 0.4, 500, 2200, 0.8);
      tone(700, 0.2, v * 0.3, 'triangle', 1200);
      break;
    case 'wobble':
      tone(200, 0.3, v * 0.4, 'sine', 300);
      break;
    case 'flump':
      noise(0.26, v * 0.7, 300, 90, 1.2);
      tone(150, 0.22, v * 0.5, 'sine', 80);
      break;
    case 'melt':
      noise(0.5, v * 0.3, 300, 120, 1.5);
      break;
    case 'shake':
      noise(0.3, v * 0.35, 700, 300, 2);
      break;
    case 'wind':
      noise(0.22, v * 0.32, 500, 1400, 0.6);
      break;
    case 'hehe': // tiny, quiet, mischievous
      tone(520, 0.07, v * 0.35, 'sine', 600);
      setTimeout(() => tone(470, 0.08, v * 0.3, 'sine', 540), 120);
      break;
    case 'yum': // soft rising "mmm"
      tone(330, 0.32, v * 0.45, 'triangle', 420);
      setTimeout(() => tone(440, 0.34, v * 0.4, 'sine', 560), 220);
      break;
    case 'warm':
      tone(780, 0.16, v * 0.25, 'sine', 940);
      break;
    case 'startle':
      tone(700, 0.09, v * 0.45, 'sine', 1100);
      noise(0.08, v * 0.2, 1200, 600, 1);
      break;
    case 'ignite':
      noise(0.28, v * 0.55, 400, 2400, 0.7);
      tone(180, 0.2, v * 0.2, 'triangle', 420);
      break;
    case 'crackle':
      noise(0.035, v * 0.45, 2200 + Math.random() * 1800, 900, 3);
      break;
    case 'thud':
      noise(0.14, v * 0.5, 260, 90, 1.4);
      tone(120, 0.12, v * 0.35, 'sine', 70);
      break;
    case 'clink':
      tone(1900, 0.18, v * 0.3, 'sine', 1700);
      setTimeout(() => tone(2600, 0.12, v * 0.18, 'sine', 2400), 40);
      noise(0.05, v * 0.25, 2500, 1500, 3);
      break;
    case 'paper':
      noise(0.09, v * 0.25, 3000, 1800, 1);
      break;
    case 'crumble':
      noise(0.4, v * 0.4, 1500, 400, 1.2);
      break;
    default:
      break;
  }
}
