// ---------------------------------------------------------------------------
// Candle creature simulation: springs, moods, reflexes.
// Pure numbers — no React. The renderer reads these values every frame.
// ---------------------------------------------------------------------------

export const CX = 210;
export const BCY = 332;
export const RX = 120;
export const RY = 112;
export const GROUND = 470;
export const TOPY = BCY - RY;
export const BODY_H = GROUND - TOPY;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];
const smooth = (t: number) => t * t * (3 - 2 * t);
const ss = (x: number) => smooth(clamp(x, 0, 1));

export class S {
  x: number;
  v = 0;
  t: number;
  k: number;
  c: number;
  constructor(x: number, k = 140, c = 14) {
    this.x = x;
    this.t = x;
    this.k = k;
    this.c = c;
  }
  step(dt: number) {
    const a = -this.k * (this.x - this.t) - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
  }
  nudge(v: number) {
    this.v += v;
  }
  set(x: number) {
    this.x = x;
    this.t = x;
    this.v = 0;
  }
}

export type Mood =
  | 'idle'
  | 'curious'
  | 'happy'
  | 'surprised'
  | 'confused'
  | 'annoyed'
  | 'covering'
  | 'peek'
  | 'sleepy'
  | 'yawn'
  | 'scared'
  | 'relieved'
  | 'tickled'
  | 'laughing'
  | 'fallen'
  | 'melted'
  | 'embarrassed'
  | 'excited'
  | 'playful'
  | 'squished'
  // --- personality layer ---
  | 'mischievous' // narrowed eyes + tiny smirk
  | 'naughty' // "I did something naughty": sideways glance + tiny smile (signature)
  | 'proud' // tiny satisfied smile
  | 'deadpan' // "... 😐"
  | 'shocked' // frozen, wide eyes
  | 'worried' // eyes on the flame, brows up
  | 'offended' // "HEY. Don't touch that."
  | 'yum' // eyes closed, cheeks warm
  | 'fascinated'; // wide eyes, hint of a smirk

type Face = {
  lid: number; // eye openness
  wide: number; // extra width / startle
  pupil: number;
  arc: number; // happy ^^ eyes
  mw: number; // mouth width
  curve: number; // smile (+) / frown (-)
  open: number; // mouth opening
  blush: number;
  flame: number; // flame height multiplier
  cover: number; // upper eyelid cover 0..1
  slant: number; // lid slant: + inner corner lower (scheming), - inner corner higher (worried)
  smirk: number; // one-sided smile (+ right corner up)
};

const F = (
  lid: number,
  wide: number,
  pupil: number,
  arc: number,
  mw: number,
  curve: number,
  open: number,
  blush: number,
  flame: number,
  cover = 0,
  slant = 0,
  smirk = 0,
): Face => ({ lid, wide, pupil, arc, mw, curve, open, blush, flame, cover, slant, smirk });

export const FACES: Record<Mood, Face> = {
  idle: F(1, 0, 1, 0, 20, 0.52, 0, 0.5, 1),
  curious: F(1.1, 0.12, 1.07, 0, 15, 0.3, 0.08, 0.56, 1.06),
  happy: F(0.95, 0.05, 1.02, 0.85, 28, 1, 0.12, 0.85, 1.14),
  surprised: F(1.38, 0.3, 0.88, 0, 15, 0.05, 0.75, 0.7, 1.45),
  confused: F(1.02, 0.05, 1, 0, 17, -0.25, 0.1, 0.6, 0.95),
  annoyed: F(0.42, 0, 0.95, 0, 19, -0.5, 0.05, 0.95, 1.05),
  covering: F(0.22, 0, 0.9, 0, 16, -0.4, 0.3, 1.1, 0.78),
  peek: F(0.72, 0.08, 1.05, 0, 14, 0.15, 0.05, 0.95, 0.95),
  sleepy: F(0.33, 0, 0.95, 0, 17, 0.22, 0.05, 0.45, 0.72),
  yawn: F(0.08, 0, 0.9, 0, 20, 0.1, 1.45, 0.6, 0.6),
  scared: F(1.42, 0.34, 0.72, 0, 13, -0.6, 0.55, 0.4, 0.3),
  relieved: F(0.5, 0, 1, 0.6, 22, 0.75, 0.15, 0.8, 1.05),
  tickled: F(0.26, 0, 1, 0.9, 24, 0.95, 0.5, 1, 1.1),
  laughing: F(0.12, 0, 1, 1, 30, 1, 1.15, 1.15, 1.2),
  fallen: F(1.12, 0.14, 1.05, 0, 14, -0.1, 0.35, 0.75, 0.85),
  melted: F(0.3, 0, 0.92, 0, 22, 0.08, 0.1, 0.6, 0.6),
  embarrassed: F(0.56, 0, 1, 0.3, 14, -0.05, 0.1, 1.35, 1),
  excited: F(1.22, 0.16, 1.06, 0, 26, 0.95, 0.55, 1, 1.3),
  playful: F(0.78, 0.04, 1.03, 0.45, 22, 0.85, 0.2, 0.9, 1.1),
  squished: F(0.5, 0, 1, 0.1, 16, 0.25, 0.3, 0.9, 0.92),
  //                lid   wide pup  arc  mw  curve open blush flame cover slant smirk
  mischievous: F(0.96, 0.0, 1.02, 0, 21, 0.78, 0.04, 0.85, 1.12, 0.3, 0.42, 0.75),
  naughty: F(0.96, 0.0, 0.96, 0, 17, 0.7, 0.0, 0.95, 1.08, 0.24, 0.22, 0.95),
  proud: F(0.8, 0.02, 1.0, 0.5, 25, 0.95, 0.04, 0.95, 1.16, 0.12, 0, 0.3),
  deadpan: F(0.8, 0, 0.8, 0, 16, 0, 0, 0.4, 0.9, 0.36, 0, 0),
  shocked: F(1.5, 0.36, 0.6, 0, 12, 0, 0.7, 0.3, 0.7),
  worried: F(1.16, 0.14, 0.92, 0, 15, -0.55, 0.12, 0.5, 0.9, 0.16, -0.7, 0),
  offended: F(0.98, 0.02, 0.92, 0, 17, -0.5, 0.04, 1.0, 1.0, 0.3, 0.6, 0),
  yum: F(0.12, 0, 1, 1, 30, 1, 0.22, 1.3, 1.2),
  fascinated: F(1.12, 0.1, 1.1, 0, 19, 0.6, 0.06, 0.88, 1.15, 0.1, 0.3, 0.55),
};

export type FlameState = 'normal' | 'disturbed' | 'struggling' | 'almostOut' | 'out' | 'relit';
export type FocusKind = 'none' | 'paper' | 'item' | 'flame' | 'cup';
export type Look = 'flame' | 'wick' | 'paper' | 'cup' | 'item' | 'user' | 'up' | 'side' | 'cursor';
type Pt = { x: number; y: number };

export class CandleSim {
  t = 0;

  // ---- body springs -------------------------------------------------------
  sx = new S(1, 170, 13);
  sy = new S(1, 170, 13);
  lean = new S(0, 120, 12); // horizontal shear of upper body (px)
  rot = new S(0, 95, 13); // tip-over rotation (rad)
  slide = new S(0, 110, 15);
  wobX = new S(0, 420, 11); // fast secondary jiggle
  wobY = new S(0, 460, 12);

  squish = new S(0, 230, 17); // localised press amount 0..1
  squishPX = CX;
  squishPY = BCY + 40;

  pullX = new S(0, 80, 11);
  pullY = new S(0, 80, 11);
  pullAX = CX;
  pullAY = BCY;

  cheekL = new S(0, 150, 13);
  cheekR = new S(0, 150, 13);

  armL = new S(0, 150, 11);
  armR = new S(0, 150, 11);
  armUp = new S(0, 130, 15);
  armStretch = new S(0, 110, 10);

  melt = new S(0, 45, 13);

  // ---- flame --------------------------------------------------------------
  flame = new S(1, 130, 14);
  flameBase = 1;
  flameLean = new S(0, 95, 10);
  alive = new S(1, 90, 16);
  glow = new S(1, 55, 13);
  fireAmt = new S(1, 150, 17); // 0 = no flame at all, 1 = full flame
  shrink = new S(1, 120, 14); // transient "ow" shrink (double-click)

  // flame state machine -----------------------------------------------------
  lit = true;
  stress = 0; // 0 calm .. 1 blown out
  fstate: FlameState = 'normal';
  jit = 0; // 0..1.5 how violently the flame flickers
  windNow = 0; // smoothed wind intensity from the cursor
  windDir = 0; // smoothed wind direction (-1 left, +1 right)
  flameAttract = 0; // external lean (toward paper, cursor draft)
  sparkT = 0; // little spark at the wick (ignite / last gasp)
  emberT = 0; // glowing wick after being blown out
  wickSmoke = 0; // seconds of smoke wisp left
  smokeReq = 0; // renderer consumes: puffs of smoke at the wick
  outT = 0;
  relitT = 0;
  private windPulse = 0;
  private windDirT = 0;
  private disturbT = 0;
  private lastWindSnd = 0;
  private outLookT = 6;

  // ---- face ---------------------------------------------------------------
  eyeX = new S(0, 64, 11.5);
  eyeY = new S(0, 64, 11.5);
  lid = new S(1, 220, 21);
  wide = new S(0, 200, 20);
  pupil = new S(1, 170, 19);
  arc = new S(0, 170, 20);
  mw = new S(20, 190, 20);
  curve = new S(0.52, 190, 20);
  open = new S(0, 200, 20);
  blush = new S(0.5, 90, 16);
  tilt = new S(0, 110, 12); // head tilt (rad)
  cover = new S(0, 170, 19); // upper eyelid cover
  slant = new S(0, 170, 19);
  smirk = new S(0, 170, 19);
  nod = new S(0, 190, 11); // head nod (px, + down)
  lookTilt = new S(0, 70, 11); // head turns slightly toward what it watches
  warm = new S(0, 60, 12); // extra cheek warmth
  shine = new S(0, 80, 12); // eyes brighten

  blink = 1; // 1 open, 0 shut (driven directly)
  private blinkT = 2;
  private blinkPhase = -1;

  // ---- state --------------------------------------------------------------
  mood: Mood = 'idle';
  private moodT = 0;
  private queue: [Mood, number][] = [];
  sleepiness = 0;
  lastInteract = 0;
  boops = 0;
  private boopDecay = 0;
  tickle = 0;
  private tickleLock = 0;
  meltMeter = 0;
  fallen = false;
  private fallDir = 1;
  grabbing = false;
  hasInteracted = false;
  sparks = 0; // renderer consumes: number of sparks requested
  private timers: { t: number; fn: () => void }[] = [];
  private idleT = 3.5;
  private pointer = { x: CX, y: BCY, active: false, present: false, near: 0 };
  onSound: (name: string, p?: number) => void = () => {};

  // ---- attention ----------------------------------------------------------
  focus: { kind: FocusKind; x: number; y: number } = { kind: 'none', x: 0, y: 0 };
  pos: Record<string, Pt> = {
    flame: { x: CX, y: 200 },
    wick: { x: CX, y: 206 },
    paper: { x: CX + 160, y: 330 },
    cup: { x: CX - 190, y: 440 },
    item: { x: CX + 160, y: 400 },
  };
  interesting: string[] = [];
  schemeOK = false; // there is something naughty within reach
  excite = 0; // 0..1 how close a held paper is to the flame
  exciteDir = 0;
  burnWatch = false; // something is burning and the candle is fascinated
  tea = 0; // 0 none, 1 warming, 2 hot
  leanBias = 0;
  busyUntil = 0; // scripted moment in progress
  freezeT = 0;
  private exciteS = 0;
  private scriptLook: { kind: Look; until: number; side: number } | null = null;
  private gazeBuf: { t: number; x: number; y: number }[] = [];
  private lastG: Pt = { x: 0, y: 0 };
  private saccT = 0;
  private wander: { x: number; y: number; k: string | null; until: number } = { x: 0, y: 0, k: null, until: 0 };
  private wanderJit = 0;
  private cursorMoveAt = -99;
  private circleAcc = 0;
  private circleCool = 0;
  private lastAng = 0;
  private yumCool = 0;
  private hesCool = 0;
  private noteCool = 0;
  private watchT = 3;

  // ---- helpers ------------------------------------------------------------
  private after(d: number, fn: () => void) {
    this.timers.push({ t: d, fn });
  }
  setMood(m: Mood, dur = 1.2) {
    this.mood = m;
    this.moodT = dur;
    this.queue.length = 0;
  }
  private forceMood(m: Mood) {
    this.mood = m;
    this.moodT = Math.max(this.moodT, 0.35);
  }
  then(m: Mood, dur = 1.2) {
    this.queue.push([m, dur]);
  }
  private touched(strength = 1) {
    this.lastInteract = this.t;
    this.sleepiness = Math.max(0, this.sleepiness - 0.5 * strength);
    this.hasInteracted = true;
  }
  /** the user is doing something with objects in the world */
  stimulus(strength = 0.4) {
    this.touched(strength);
  }
  private jiggle(ax: number, ay: number) {
    this.wobX.nudge(ax);
    this.wobY.nudge(ay);
  }
  private flare(amount = 0.5) {
    this.flame.nudge(amount * 14);
    this.glow.nudge(amount * 5);
    if (amount > 0.45) this.sparks += 2 + ((Math.random() * 3) | 0);
  }
  private baseMood(): Mood {
    if (!this.lit) return 'deadpan';
    if (this.burnWatch) return 'fascinated';
    if (this.exciteS > 0.82) return 'mischievous';
    if (this.exciteS > 0.5) return 'fascinated';
    if (this.tea >= 2) return 'excited';
    if (this.exciteS > 0.2 || this.tea === 1) return 'curious';
    return this.sleepiness > 0.62 ? 'sleepy' : 'idle';
  }

  // ---- gaze ---------------------------------------------------------------
  lookAt(kind: Look, dur: number, side = Math.random() < 0.5 ? -1 : 1) {
    this.scriptLook = { kind, until: this.t + dur, side };
  }
  setFocus(kind: FocusKind, x = 0, y = 0) {
    this.focus.kind = kind;
    this.focus.x = x;
    this.focus.y = y;
  }

  // ---- interactions -------------------------------------------------------
  setPointer(x: number, y: number, active: boolean) {
    if (Math.hypot(x - this.pointer.x, y - this.pointer.y) > 1.5) this.cursorMoveAt = this.t;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = active;
    this.pointer.present = true;
  }
  pointerLeft() {
    this.pointer.present = false;
    this.pointer.active = false;
    this.pointer.near = 0;
  }

  boop(x: number, y: number) {
    this.touched();
    this.boops++;
    this.boopDecay = 4.2;
    this.squishPX = x;
    this.squishPY = y;
    this.squish.set(0);
    this.squish.nudge(14);
    this.sy.nudge(-1.4);
    this.sx.nudge(0.8);
    this.jiggle(rand(-0.6, 0.6) + (x - CX) * 0.004, -1.6);
    this.flare(0.55);
    this.armL.nudge(rand(-3, -1));
    this.armR.nudge(rand(1, 3));
    this.onSound('boop', clamp(this.boops / 8, 0, 1));

    if (this.fallen) {
      this.setMood('fallen', 1.4);
      return;
    }

    if (this.boops >= 7) {
      // "okay, STOP 😭"
      this.setMood('annoyed', 0.5);
      this.then('covering', 1.9);
      this.then('peek', 1.4);
      this.then('embarrassed', 1.0);
      this.then('happy', 1.1);
      this.armUp.t = 1;
      this.tilt.t = rand(-0.14, 0.14);
      this.after(0.45, () => {
        this.lean.nudge(rand(-26, -16) * (Math.random() < 0.5 ? 1 : -1));
      });
      this.after(2.45, () => {
        this.armUp.t = 0;
        this.tilt.t = 0;
      });
      this.onSound('whine');
    } else if (this.boops >= 4) {
      const r = pick(['excited', 'embarrassed', 'playful'] as Mood[]);
      this.setMood('surprised', 0.28);
      this.then(r, 1.3);
      this.then('idle', 0.2);
      this.tilt.nudge(rand(-1.6, 1.6));
    } else if (this.boops === 2) {
      this.setMood('surprised', 0.26);
      this.then('confused', 1.5);
      this.tilt.t = rand(0.1, 0.18) * (Math.random() < 0.5 ? -1 : 1);
      this.after(1.7, () => (this.tilt.t = 0));
    } else {
      this.setMood('surprised', 0.42);
      this.then(pick(['happy', 'curious', 'playful'] as Mood[]), rand(0.9, 1.5));
      if (Math.random() < 0.35) this.tilt.nudge(rand(-1.2, 1.2));
    }
  }

  cheekPoke(side: -1 | 1, x: number, y: number) {
    this.touched();
    const c = side < 0 ? this.cheekL : this.cheekR;
    c.nudge(side * 9);
    this.squishPX = x;
    this.squishPY = y;
    this.squish.nudge(8);
    this.tilt.nudge(side * 1.1);
    this.jiggle(side * 0.5, -0.8);
    this.flare(0.3);
    (side < 0 ? this.armL : this.armR).nudge(side * 3);
    this.setMood(pick(['surprised', 'confused', 'playful'] as Mood[]), rand(0.7, 1.2));
    this.then('happy', 0.9);
    this.onSound('squish', 0.5);
  }

  cheekPull(side: -1 | 1, amount: number) {
    this.touched(0.4);
    const c = side < 0 ? this.cheekL : this.cheekR;
    c.t = clamp(amount, -34, 34);
    this.tilt.t = clamp(-side * Math.abs(amount) * 0.004, -0.14, 0.14);
    if (Math.abs(amount) > 10 && this.mood !== 'confused' && this.mood !== 'annoyed') {
      this.setMood(pick(['confused', 'annoyed', 'surprised'] as Mood[]), 0.9);
    }
  }

  cheekRelease() {
    this.cheekL.t = 0;
    this.cheekR.t = 0;
    this.cheekL.nudge(-this.cheekL.x * 1.5);
    this.cheekR.nudge(-this.cheekR.x * 1.5);
    this.tilt.t = 0;
    this.setMood(pick(['confused', 'embarrassed', 'happy'] as Mood[]), 1.2);
    this.onSound('pop', 0.4);
  }

  pressStart(x: number, y: number) {
    this.touched();
    this.squishPX = x;
    this.squishPY = y;
    this.squish.t = 1;
    this.sy.t = 0.9;
    this.sx.t = 1.07;
    this.setMood('squished', 99);
    this.flame.nudge(-3);
    this.onSound('squish', 0.8);
  }

  pressMove(x: number, y: number) {
    this.squishPX += (x - this.squishPX) * 0.25;
    this.squishPY += (y - this.squishPY) * 0.25;
  }

  pressEnd() {
    this.squish.t = 0;
    this.squish.nudge(-9);
    this.sy.t = 1;
    this.sx.t = 1;
    this.sy.nudge(2.6);
    this.sx.nudge(-1.2);
    this.jiggle(rand(-0.7, 0.7), -2.1);
    this.flare(0.45);
    this.addMelt(0.17);
    this.setMood(pick(['happy', 'surprised', 'playful', 'confused'] as Mood[]), rand(0.8, 1.3));
    this.onSound('pop', 0.6);
  }

  grabStart(x: number, y: number) {
    this.touched();
    this.grabbing = true;
    this.pullAX = x;
    this.pullAY = y;
    this.setMood('surprised', 0.45);
    this.then('curious', 99);
  }

  grabMove(dx: number, dy: number) {
    // soft limits — resistance grows with distance (keeps things stable)
    const soft = (v: number, lim: number) => (lim * v) / (lim + Math.abs(v) * 0.85);
    this.pullX.t = soft(dx, 115);
    this.pullY.t = soft(dy, 135);
    const mag = Math.hypot(this.pullX.t, this.pullY.t);
    this.flameBase = 1 + (clamp(-this.pullY.t, 0, 130) / 130) * 0.75;
    this.flameLean.t = clamp(-this.pullX.t * 0.004, -0.5, 0.5);
    if (mag > 55) {
      const m: Mood = -this.pullY.t > 50 ? 'surprised' : Math.abs(this.pullX.t) > 60 ? 'confused' : 'curious';
      if (this.mood !== m) {
        this.mood = m;
        this.moodT = 99;
      }
    }
  }

  grabEnd(vx: number, vy: number) {
    const mag = Math.hypot(this.pullX.x, this.pullY.x);
    this.grabbing = false;
    this.pullX.t = 0;
    this.pullY.t = 0;
    this.flame.t = 1;
    this.flameLean.t = 0;
    this.pullX.nudge(-this.pullX.x * 2.2 - vx * 0.05);
    this.pullY.nudge(-this.pullY.x * 2.2 - vy * 0.04);
    this.jiggle(-this.pullX.x * 0.012, -Math.abs(this.pullY.x) * 0.02 - 1);
    this.sy.nudge(clamp(-this.pullY.x, -40, 60) * 0.03);
    this.flare(0.4 + clamp(mag / 220, 0, 0.5));
    this.addMelt(clamp(mag / 420, 0, 0.3));
    this.onSound('boing', clamp(mag / 160, 0.2, 1));
    if (mag > 40) {
      this.setMood(pick(['surprised', 'happy', 'confused', 'excited'] as Mood[]), rand(0.8, 1.4));
      this.then('idle', 0.3);
    } else {
      this.setMood('curious', 0.6);
    }
    // a strong horizontal fling can tip the little one over
    if (!this.fallen && Math.abs(vx) > 900 && Math.abs(this.pullX.x) > 55) {
      this.push(Math.sign(vx), clamp(Math.abs(vx) / 1400, 0.4, 1.4));
    }
  }

  armTug(side: -1 | 1, amount: number) {
    this.touched(0.3);
    const a = side < 0 ? this.armL : this.armR;
    a.t = clamp(amount, -40, 40);
    this.armStretch.t = clamp(Math.abs(amount) / 40, 0, 1);
    this.lean.t = clamp(amount * 0.12, -16, 16);
  }

  armRelease() {
    this.armL.t = 0;
    this.armR.t = 0;
    this.armStretch.t = 0;
    this.armL.nudge(-this.armL.x * 2.6);
    this.armR.nudge(-this.armR.x * 2.6);
    this.armStretch.nudge(-3);
    this.lean.t = 0;
    this.lean.nudge(rand(-6, 6));
    this.setMood(pick(['happy', 'playful', 'surprised'] as Mood[]), 1);
    this.onSound('pop', 0.35);
  }

  addTickle(amount: number) {
    if (this.tickleLock > 0) return;
    this.touched(0.2);
    this.tickle = clamp(this.tickle + amount, 0, 1.35);
    if (this.tickle > 1.2) {
      // flop over laughing
      this.tickleLock = 5.2;
      this.tickle = 0;
      this.fallOver(Math.random() < 0.5 ? -1 : 1, true);
      this.onSound('giggle', 1);
    }
  }

  // ---- flame: poke, disturb, wind, blow out, relight -----------------------
  /** single click on the flame: a light poke */
  flameTap(dir: number) {
    if (!this.lit) return;
    this.touched();
    this.flame.nudge(-10);
    this.flameLean.nudge(dir * 4);
    this.jiggle(rand(-0.3, 0.3), -0.6);
    this.setMood('surprised', 0.35);
    this.then('curious', 0.9);
    this.lookAt('flame', 0.9);
    this.onSound('puff', 0.4);
  }

  /** double click on the flame: "HEY. Don't touch that." */
  flameDouble(dir: number) {
    if (!this.lit) return;
    this.touched();
    this.stress = Math.min(0.58, this.stress + 0.3);
    this.disturbT = 1.8;
    this.flame.nudge(26); // sudden jump
    this.flameLean.nudge(dir * 12); // leans away
    this.shrink.t = 0.6; // shrinks
    this.after(1.3, () => (this.shrink.t = 1));
    this.sparks += 4;
    this.glow.nudge(-4);
    this.jiggle(-dir * 0.9, -1.2);
    this.lean.nudge(-dir * 18);
    this.onSound('puff', 0.8);
    this.busyUntil = this.t + 3.2;
    this.setMood('offended', 1.3);
    this.then('confused', 1.2);
    this.lookAt('flame', 1.5);
    this.armUp.t = 0.4;
    this.after(0.7, () => (this.armUp.t = 0));
    this.after(1.6, () => this.lookAt('user', 0.9));
  }

  /** wind from the cursor: strength 0..1.2, dir -1/+1 */
  flameWindIn(strength: number, dir: number) {
    if (!this.lit) return;
    this.touched(0.2);
    if (strength > this.windPulse) this.windPulse = strength;
    if (strength > 0.02) this.windDirT = dir;
    if (strength > 0.45 && this.t - this.lastWindSnd > 0.4) {
      this.lastWindSnd = this.t;
      this.onSound('wind', strength);
    }
  }

  extinguish() {
    if (!this.lit) return;
    this.lit = false;
    this.stress = 1;
    this.fstate = 'out';
    this.outT = 0;
    this.outLookT = 6;
    this.fireAmt.t = 0;
    this.fireAmt.k = 210;
    this.fireAmt.c = 30;
    this.sparkT = 0.55;
    this.emberT = 2.4;
    this.wickSmoke = 3.4;
    this.smokeReq += 4;
    this.armUp.t = 0;
    this.shrink.t = 1;
    this.touched(1);
    this.freezeT = 0.8; // it freezes for a tiny moment…
    this.busyUntil = this.t + 7;
    this.onSound('puff', 1);
    this.setMood('shocked', 0.85);
    this.lookAt('flame', 0.85);
    this.after(0.85, () => {
      if (this.lit) return;
      this.setMood('confused', 1.5); // …looks up where the flame was
      this.lookAt('up', 1.5);
      this.tilt.t = 0.13;
    });
    this.after(2.4, () => {
      if (this.lit) return;
      this.tilt.t = 0;
      this.setMood('deadpan', 99); // "... 😐"
      this.lookAt('user', 2.2);
      this.sy.nudge(-0.5);
    });
    this.after(5, () => {
      if (!this.lit) this.lookAt('wick', 1.0);
    });
  }

  relight() {
    if (this.lit) return;
    this.lit = true;
    this.stress = 0;
    this.fstate = 'relit';
    this.relitT = 2.6;
    this.emberT = 0;
    this.wickSmoke = 0;
    this.sparkT = 0.5; // tiny spark…
    this.fireAmt.k = 48; // …tiny flame that grows with a little overshoot
    this.fireAmt.c = 6.5;
    this.fireAmt.t = 0;
    this.touched(1);
    this.busyUntil = this.t + 5.5;
    this.tilt.t = 0;
    this.onSound('relight', 0.8);
    this.setMood('surprised', 0.4);
    this.lookAt('wick', 0.5);
    this.after(0.4, () => {
      this.fireAmt.t = 1;
      this.sparks += 4;
      this.flame.nudge(6);
    });
    this.after(0.75, () => {
      this.setMood('relieved', 1.0);
      this.then('happy', 2.4);
      this.warm.t = 0.55; // cheeks a little warmer
      this.shine.t = 0.9; // eyes brighten
      this.lookAt('flame', 0.8);
    });
    this.after(1.1, () => {
      this.sy.nudge(2.4); // tiny happy bounce
      this.sx.nudge(-1);
      this.jiggle(rand(-0.4, 0.4), -2);
      this.onSound('pop', 0.5);
    });
    this.after(1.5, () => this.flare(0.6));
    this.after(1.9, () => {
      this.flame.nudge(-8); // cute little flicker
      this.after(0.12, () => this.flare(0.5));
    });
    this.after(2.3, () => this.lookAt('user', 1.0));
    this.after(4.6, () => {
      this.warm.t = 0;
      this.shine.t = 0;
    });
  }

  // ---- world-driven moments --------------------------------------------------
  /** a paper is lifted: the candle notices */
  noticePaper(kind: string) {
    this.touched(0.5);
    this.lookAt('paper', 1.1);
    if (kind === 'dontburn' && this.t > this.noteCool && this.lit) {
      // "DO NOT BURN": paper → user → flame → tiny smile
      this.noteCool = this.t + 12;
      this.busyUntil = this.t + 4.8;
      this.setMood('curious', 1.0);
      this.lookAt('paper', 1.0);
      this.after(0.95, () => {
        this.lookAt('user', 0.85);
        this.setMood('surprised', 0.3);
        this.then('curious', 0.6);
      });
      this.after(1.85, () => {
        this.lookAt('flame', 0.85);
        this.setMood('curious', 0.9);
      });
      this.after(2.75, () => {
        this.lookAt('user', 1.7);
        this.setMood('naughty', 1.9);
        this.onSound('hehe', 0.6);
        this.flame.nudge(6);
      });
    } else if (this.mood === 'idle' || this.mood === 'sleepy') {
      this.setMood('curious', 1.0);
    }
  }

  /** held paper reaches the point of "should we do it?" */
  hesitate() {
    if (this.t < this.hesCool || this.t < this.busyUntil || !this.lit) return;
    this.hesCool = this.t + 14;
    this.busyUntil = this.t + 3.8;
    this.setMood('curious', 1.0);
    this.lookAt('paper', 1.0);
    this.after(0.95, () => {
      this.lookAt('user', 0.85);
      this.setMood('mischievous', 1.0);
      this.flame.nudge(5);
      this.onSound('hehe', 0.5);
    });
    this.after(1.85, () => {
      this.lookAt('paper', 1.4);
      this.setMood('mischievous', 2.2);
      this.flare(0.35);
    });
  }

  paperIgnited() {
    this.touched(1);
    this.busyUntil = this.t + 4.6;
    this.setMood('surprised', 0.35);
    this.lookAt('paper', 0.6);
    this.flare(0.8);
    this.after(0.4, () => {
      this.lookAt('user', 0.85); // looks at the user…
      this.setMood('naughty', 1.3); // …tiny smile, playful eyes
      this.onSound('hehe', 0.7);
    });
    this.after(0.95, () => {
      this.sy.nudge(2.0); // little happy bounce
      this.jiggle(rand(-0.3, 0.3), -1.6);
      this.flare(0.5);
    });
    this.after(1.8, () => this.lookAt('paper', 3));
  }

  paperGone() {
    this.touched(1);
    this.busyUntil = this.t + 5.8;
    this.setMood('proud', 2.4); // big satisfied little smile
    this.lookAt('paper', 0.7);
    this.after(0.55, () => {
      this.nod.nudge(22); // tiny proud nod
      this.flare(0.4);
    });
    this.after(1.2, () => this.lookAt('user', 1.0));
    this.after(2.5, () => {
      this.setMood('naughty', 2.2); // "hehe… you saw nothing"
      this.lookAt('side', 1.8);
      this.onSound('hehe', 0.6);
    });
    this.after(4.6, () => this.lookAt('user', 0.9));
  }

  startle(dir: number) {
    if (this.fallen) return;
    this.touched(0.6);
    this.busyUntil = Math.max(this.busyUntil, this.t + 1.8);
    this.setMood('scared', 0.35);
    this.then('surprised', 0.55);
    this.then('embarrassed', 0.8);
    this.sy.nudge(2.6);
    this.jiggle(dir * 0.6, -1.8);
    this.armUp.t = 0.5;
    this.after(0.55, () => (this.armUp.t = 0));
    this.lookAt('item', 1.2);
    this.onSound('startle', 0.7);
  }

  steamNotice() {
    this.touched(0.5);
    this.lookAt('cup', 1.8);
    if (this.t >= this.busyUntil) this.setMood('curious', 1.5);
  }

  teaHot() {
    this.lookAt('cup', 1.6);
    if (this.t >= this.busyUntil) {
      this.setMood('excited', 1.5);
      this.flare(0.4);
    }
    this.warm.t = 0.4;
    this.after(3, () => (this.warm.t = 0));
    this.onSound('warm', 0.5);
  }

  /** the tea is just right: "hehe, perfect." */
  yum() {
    if (this.t < this.yumCool || !this.lit) return;
    this.yumCool = this.t + 14;
    this.touched(1);
    this.busyUntil = this.t + 4.8;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.setMood('yum', 2.3); // eyes closed, smile
    this.then('proud', 0.9);
    this.then('happy', 1.2);
    this.armUp.t = 0.55; // little hands toward its face
    this.tilt.t = 0.13 * side; // head tilt
    this.warm.t = 0.8;
    this.shine.t = 0.5;
    this.after(0.35, () => {
      this.sy.nudge(1.6);
      this.jiggle(0, -1.4);
      this.flare(0.5);
      this.onSound('yum', 0.7);
    });
    this.after(1.0, () => {
      this.tilt.t = -0.1 * side;
      this.flame.nudge(5); // flame flickers happily
    });
    this.after(1.5, () => {
      this.sy.nudge(1.2);
      this.flare(0.35);
    });
    this.after(2.3, () => {
      this.armUp.t = 0;
      this.tilt.t = 0;
      this.lookAt('user', 1.1);
    });
    this.after(2.7, () => this.onSound('hehe', 0.5));
    this.after(4.5, () => {
      this.warm.t = 0;
      this.shine.t = 0;
    });
  }

  /** occasional bad influence: eyes a paper, eyes you, eyes the paper again */
  private wantsFun() {
    const opts = this.interesting.filter((k) => k === 'paper' || k === 'cup');
    if (!opts.length) return;
    const k = pick(opts) as Look;
    this.busyUntil = this.t + 4.4;
    this.setMood('curious', 1.1);
    this.lookAt(k, 1.2);
    this.after(1.2, () => {
      this.lookAt('user', 1.0);
      this.setMood('mischievous', 1.6);
    });
    this.after(2.4, () => {
      this.lookAt(k, 1.0);
      this.flame.nudge(4);
    });
    this.after(3.4, () => {
      this.lookAt('user', 0.8);
      this.setMood('naughty', 1.0);
    });
  }

  private curiousCircle(sign: number) {
    this.touched(0.3);
    this.setMood('fascinated', 1.9);
    this.tilt.t = sign * 0.1;
    this.after(1.9, () => (this.tilt.t = 0));
    this.onSound('pop', 0.3);
  }

  push(dir: number, power: number) {
    this.touched();
    if (this.fallen) return;
    this.lean.nudge(dir * power * 90);
    this.jiggle(dir * power * 1.2, -1);
    this.flameLean.nudge(-dir * power * 3);
    if (power > 0.85) {
      this.fallOver(dir, false);
    } else {
      // wobble... almost falls... catches itself
      this.rot.t = dir * clamp(power, 0.15, 0.55) * 0.55;
      this.setMood('scared', 0.5);
      this.then('relieved', 0.9);
      this.then('annoyed', 0.6);
      this.after(0.42, () => {
        this.rot.t = 0;
        this.rot.nudge(-dir * 2.4);
        this.armL.nudge(-7);
        this.armR.nudge(7);
      });
      this.onSound('wobble', power);
    }
  }

  fallOver(dir: number, laughing: boolean) {
    this.fallen = true;
    this.fallDir = dir;
    this.rot.t = dir * 0.62;
    this.slide.t = dir * 20;
    this.sy.t = 0.87;
    this.sx.t = 1.13;
    this.setMood(laughing ? 'laughing' : 'surprised', laughing ? 2.2 : 0.7);
    if (!laughing) this.then('fallen', 1.9);
    this.after(0.42, () => {
      this.onSound('flump', 1);
      this.jiggle(dir * 1.6, 2.2);
      this.sparks += 2;
    });
    this.after(laughing ? 3.2 : 2.6, () => {
      // get back up
      this.rot.t = 0;
      this.slide.t = 0;
      this.sy.t = 1;
      this.sx.t = 1;
      this.rot.nudge(-this.fallDir * 1.4);
      this.jiggle(-dir * 0.8, -1.6);
      this.flare(0.5);
      this.fallen = false;
      this.setMood('embarrassed', 1.4);
      this.then('happy', 1.1);
      this.onSound('boing', 0.5);
    });
  }

  addMelt(v: number) {
    if (this.melt.t > 0.5) return;
    this.meltMeter += v;
    if (this.meltMeter > 1) {
      this.meltMeter = 0;
      this.melt.t = 1;
      this.setMood('melted', 4.2);
      this.onSound('melt', 0.6);
      this.after(4.0, () => {
        // "...wait, what happened to me"
        this.melt.t = 0;
        this.setMood('surprised', 0.5);
        this.then('embarrassed', 1.2);
        this.then('happy', 1);
        for (let i = 0; i < 5; i++) {
          this.after(0.05 * i, () => this.jiggle(i % 2 ? 1.5 : -1.5, -0.5));
        }
        this.flare(0.6);
        this.onSound('shake', 0.6);
      });
    }
  }

  // ---- gaze helpers -----------------------------------------------------------
  private eyeOffset(p: Pt, near = 60): Pt {
    const dx = p.x - CX;
    const dy = p.y - (BCY - 4);
    const dist = Math.hypot(dx, dy) || 1;
    const m = clamp(dist / near, 0.25, 1);
    return { x: (dx / dist) * m * 8.6, y: clamp((dy / dist) * m * 7, -7, 5.5) };
  }

  // ---- main update --------------------------------------------------------
  update(dtRaw: number) {
    const dt = clamp(dtRaw, 0.0005, 0.05);
    this.t += dt;

    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }

    // smoothed excitement (a paper creeping toward the flame)
    this.exciteS += (this.excite - this.exciteS) * Math.min(1, dt * 4);
    if (this.freezeT > 0) this.freezeT -= dt;

    // mood queue
    this.moodT -= dt;
    if (this.moodT <= 0) {
      const next = this.queue.shift();
      if (next) {
        this.mood = next[0];
        this.moodT = next[1];
      } else {
        this.mood = this.baseMood();
        this.moodT = 0.4;
      }
    }

    // decays
    if (this.boopDecay > 0) {
      this.boopDecay -= dt;
      if (this.boopDecay <= 0) this.boops = Math.max(0, this.boops - 2);
      if (this.boops > 0 && this.boopDecay <= 0) this.boopDecay = 2.2;
    }
    this.tickle = Math.max(0, this.tickle - dt * 0.62);
    if (this.tickleLock > 0) this.tickleLock -= dt;

    const idleFor = this.t - this.lastInteract;
    if (idleFor > 11) this.sleepiness = clamp(this.sleepiness + dt * 0.055, 0, 1);
    else this.sleepiness = clamp(this.sleepiness - dt * 0.09, 0, 1);

    // ---- flame state machine: normal → disturbed → struggling → almost out → out → relit
    {
      const wRate = this.windPulse > this.windNow ? 16 : 3.2;
      this.windNow += (this.windPulse - this.windNow) * Math.min(1, wRate * dt);
      if (this.windPulse > 0.02) this.windDir += (this.windDirT - this.windDir) * Math.min(1, 12 * dt);
      else this.windDir *= Math.max(0, 1 - dt * 2.5);
      this.windPulse = 0;
      if (this.disturbT > 0) this.disturbT -= dt;
      if (this.sparkT > 0) this.sparkT -= dt;
      if (this.emberT > 0) this.emberT -= dt;
      if (this.relitT > 0) this.relitT -= dt;
      if (this.wickSmoke > 0) this.wickSmoke -= dt;

      if (this.lit) {
        // intensity × duration decides the outcome — slow waving never blows it out
        const w = this.windNow;
        const gain = Math.pow(Math.max(0, w - 0.12), 1.4) * 1.5;
        const rec = this.disturbT > 0 ? 0.04 : 0.17;
        this.stress = clamp(this.stress + (gain - rec) * dt, 0, 1);
        if (this.stress >= 1) this.extinguish();
      } else {
        this.outT += dt;
      }
      const prev = this.fstate;
      const next: FlameState = !this.lit
        ? 'out'
        : this.relitT > 0
          ? 'relit'
          : this.stress > 0.75
            ? 'almostOut'
            : this.stress > 0.4
              ? 'struggling'
              : this.stress > 0.1 || this.disturbT > 0
                ? 'disturbed'
                : 'normal';
      if (next !== prev) {
        this.fstate = next;
        if (this.lit && this.t >= this.busyUntil) {
          if (next === 'disturbed' && prev === 'normal') this.lookAt('flame', 1.4);
          else if (next === 'struggling') {
            this.lookAt('flame', 1.8);
            this.armUp.t = 0.3;
          } else if (next === 'almostOut') {
            this.lookAt('flame', 2);
            this.armUp.t = 0.7;
            this.onSound('wobble', 0.6);
          } else if (next === 'normal' && (prev === 'struggling' || prev === 'almostOut')) {
            this.armUp.t = 0;
            this.setMood('relieved', 1.2);
            this.lookAt('user', 0.9);
            this.sy.nudge(0.9);
          } else if (next === 'normal' || next === 'disturbed') {
            if (this.armUp.t < 0.35) this.armUp.t = 0;
          }
        }
      }
      if (this.lit && this.t >= this.busyUntil && this.freezeT <= 0) {
        if (this.stress > 0.75) this.forceMood('scared');
        else if (this.stress > 0.4) this.forceMood('worried');
        else if (this.stress > 0.12 && (this.mood === 'idle' || this.mood === 'curious')) this.forceMood('curious');
      }
      this.jit = clamp(this.stress * 1.5 + (this.disturbT > 0 ? 0.9 * Math.min(1, this.disturbT) : 0), 0, 1.5);

      // out: glance up at the wick from time to time, hoping
      if (!this.lit && this.outT > 6 && this.t >= this.busyUntil) {
        this.outLookT -= dt;
        if (this.outLookT <= 0) {
          this.outLookT = rand(5, 8);
          this.lookAt('wick', 0.9);
          this.after(1.0, () => {
            if (!this.lit) this.lookAt('user', 1.4);
          });
        }
      }
    }

    // tickle reactions
    if (this.tickle > 0.22 && !this.fallen) {
      const w = this.tickle;
      const sh = Math.sin(this.t * 34) * w * (w > 0.6 ? 2.6 : 1.2);
      this.lean.t = sh * 3.2;
      this.wobX.nudge(Math.sin(this.t * 41) * w * 0.9 * dt * 60);
      if (w > 0.55) {
        this.armL.t = -10 * w;
        this.armR.t = 10 * w;
        this.flame.nudge(Math.sin(this.t * 50) * 3);
      }
      if (this.mood !== 'laughing') {
        const m: Mood = w > 0.78 ? 'tickled' : 'playful';
        if (this.mood !== m) {
          this.mood = m;
          this.moodT = 0.4;
        }
      }
    } else if (!this.grabbing && Math.abs(this.armL.t) > 0 && this.armStretch.t === 0) {
      this.armL.t *= Math.max(0, 1 - dt * 6);
      this.armR.t *= Math.max(0, 1 - dt * 6);
      this.lean.t *= Math.max(0, 1 - dt * 5);
    }

    // ---- idle life --------------------------------------------------------
    this.blinkT -= dt;
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt;
      const d = 0.13;
      const p = this.blinkPhase / d;
      this.blink = p < 0.5 ? 1 - smooth(p * 2) : smooth((p - 0.5) * 2);
      if (this.blinkPhase > d) {
        this.blinkPhase = -1;
        this.blink = 1;
      }
    } else if (this.blinkT <= 0 && this.freezeT <= 0) {
      this.blinkPhase = 0;
      this.blinkT = rand(1.8, 6) * (this.sleepiness > 0.5 ? 0.6 : 1);
      if (Math.random() < 0.18) this.blinkT = rand(0.2, 0.35); // double blink
    }

    const calm = !this.grabbing && this.tickle < 0.2 && !this.fallen && this.moodT < 0.5 && this.freezeT <= 0;
    const free =
      calm && this.lit && !this.burnWatch && this.exciteS < 0.2 && this.tea === 0 && this.t >= this.busyUntil && this.stress < 0.1;
    this.idleT -= dt;
    if (this.idleT <= 0 && free) {
      this.idleT = rand(3.2, 7.5);
      const r = Math.random();
      if (this.sleepiness > 0.6 && r < 0.45) {
        // yawn
        this.setMood('yawn', 1.5);
        this.then('sleepy', 2.2);
        this.sy.nudge(1.2);
        this.flame.nudge(-4);
        this.after(1.5, () => this.flare(0.3));
      } else if (this.schemeOK && idleFor > 5 && this.sleepiness < 0.5 && Math.random() < 0.3) {
        this.wantsFun();
      } else if (r < 0.3) {
        this.tilt.t = rand(-0.12, 0.12);
        this.after(rand(1.1, 2), () => (this.tilt.t = 0));
        this.setMood('curious', 1.4);
      } else if (r < 0.52) {
        this.sy.nudge(-0.5);
        this.jiggle(rand(-0.3, 0.3), -0.4);
        this.setMood(pick(['happy', 'playful'] as Mood[]), 1.1);
      } else if (r < 0.72) {
        this.lean.nudge(rand(-7, 7));
        this.armL.nudge(rand(-2, 2));
        this.armR.nudge(rand(-2, 2));
      }
      // otherwise: just sit there and stare. stillness matters.
    }

    // while something burns it glances at the user now and then ("I know this is bad…")
    if (this.burnWatch && this.lit && this.t >= this.busyUntil) {
      this.watchT -= dt;
      if (this.watchT <= 0) {
        this.watchT = rand(3, 5.5);
        this.lookAt('user', 0.75);
        this.setMood('naughty', 1.0);
        this.after(0.2, () => this.sy.nudge(0.6));
      }
    }

    // ---- gaze: attention, anticipation, delayed follow ----------------------
    const px = this.pointer.x;
    const py = this.pointer.y;
    const dist = Math.hypot(px - CX, (py - BCY) * 0.8);
    this.pointer.near = this.pointer.present ? clamp(1 - (dist - 110) / 180, 0, 1) : 0;

    let tgt: Pt | null = null;
    let direct = false;
    let delay = 0.17;
    const sl = this.scriptLook;
    if (sl && this.t < sl.until) {
      const k = sl.kind;
      if (k === 'user') direct = true;
      else if (k === 'up') tgt = { x: CX + sl.side * 40, y: BCY - 230 };
      else if (k === 'side') tgt = { x: CX + sl.side * 320, y: BCY + 8 };
      else if (k === 'cursor') tgt = { x: px, y: py };
      else tgt = this.pos[k];
      delay = 0.05;
    } else {
      this.scriptLook = null;
      if (this.focus.kind !== 'none') {
        tgt = { x: this.focus.x, y: this.focus.y };
        delay = 0.09;
      } else if (this.pointer.present && this.t - this.cursorMoveAt < 7) {
        tgt = { x: px, y: py };
        delay = 0.17;
      }
    }

    let want: Pt;
    if (this.mood === 'sleepy' || this.mood === 'yawn') {
      if (this.t > this.wander.until) this.wander = { x: rand(-2, 2), y: rand(0, 2.5), k: null, until: this.t + rand(1, 2.5) };
      want = { x: this.wander.x, y: this.wander.y };
    } else if (direct) {
      want = { x: 0, y: 0.6 };
    } else if (tgt) {
      want = this.eyeOffset(tgt, this.focus.kind === 'none' && !sl ? 60 : 90);
    } else {
      // user left / nothing to watch: back to idle — mostly staring, sometimes glancing around
      if (this.t > this.wander.until) {
        const r = Math.random();
        if (r < 0.5 || (!this.interesting.length && r < 0.75)) {
          this.wander = { x: rand(-1.2, 1.2), y: rand(-0.8, 0.8), k: null, until: this.t + rand(2.4, 5.5) };
        } else if (r < 0.75) {
          this.wander = { x: rand(-6.5, 6.5), y: rand(-3, 3), k: null, until: this.t + rand(0.7, 1.7) };
        } else {
          this.wander = { x: 0, y: 0, k: pick(this.interesting), until: this.t + rand(0.9, 1.9) };
        }
      }
      if (this.wander.k && this.pos[this.wander.k]) want = this.eyeOffset(this.pos[this.wander.k], 90);
      else want = { x: this.wander.x, y: this.wander.y };
      this.wanderJit -= dt;
      if (this.wanderJit <= 0) {
        this.wanderJit = rand(0.3, 0.9);
        want = { x: want.x + rand(-0.4, 0.4), y: want.y + rand(-0.3, 0.3) };
      }
    }
    if (this.mood === 'embarrassed' && !sl) want = { x: 6 * (this.fallDir || 1), y: 3 };

    // delayed follow: the eyes lag a little behind what they're watching…
    this.gazeBuf.push({ t: this.t, x: want.x, y: want.y });
    while (this.gazeBuf.length > 2 && this.gazeBuf[1].t <= this.t - delay) this.gazeBuf.shift();
    const used = this.gazeBuf[0];
    // …unless the target jumps: then a quick saccade with a tiny wind-up
    const jx = used.x - this.lastG.x;
    const jy = used.y - this.lastG.y;
    if (Math.hypot(jx, jy) > 5.5) {
      this.saccT = 0.24;
      this.eyeX.nudge(-jx * 4);
      this.eyeY.nudge(-jy * 4);
    }
    this.lastG = { x: used.x, y: used.y };
    if (this.saccT > 0) this.saccT -= dt;
    const fast = this.saccT > 0;
    this.eyeX.k = this.eyeY.k = fast ? 340 : 64;
    this.eyeX.c = this.eyeY.c = fast ? 26 : 11.5;
    this.eyeX.t = used.x;
    this.eyeY.t = used.y;
    this.lookTilt.t = clamp(used.x * 0.006, -0.06, 0.06);

    // cursor circling around it → curious
    if (this.pointer.present) {
      const ang = Math.atan2(py - (BCY - 10), px - CX);
      let da = ang - this.lastAng;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      this.lastAng = ang;
      if (dist > 90 && dist < 330 && Math.abs(da) < 0.9) this.circleAcc += da;
    }
    this.circleAcc *= Math.max(0, 1 - dt * 0.45);
    if (Math.abs(this.circleAcc) > 5.2 && this.t > this.circleCool && calm && this.lit && this.t >= this.busyUntil) {
      this.circleCool = this.t + 9;
      const s = Math.sign(this.circleAcc);
      this.circleAcc = 0;
      this.curiousCircle(s);
    }

    // curiosity: pointer hovering close → lean in slightly
    if (calm && this.pointer.near > 0.35 && this.mood === 'idle') {
      this.mood = 'curious';
      this.moodT = 0.3;
      this.lean.t = clamp((px - CX) * 0.018, -7, 7);
    } else if (calm && this.tickle < 0.1 && !this.grabbing) {
      this.lean.t *= Math.max(0, 1 - dt * 3);
    }
    // fascination: leans toward whatever it's watching burn / warm
    if (this.leanBias !== 0 && this.tickle < 0.2 && !this.grabbing && !this.fallen && this.armStretch.t === 0) {
      this.lean.t = this.leanBias;
    }

    // ---- face targets from mood ------------------------------------------
    const f = FACES[this.mood];
    const sleepMix = this.mood === 'idle' || this.mood === 'curious' ? this.sleepiness * 0.55 : 0;
    const sf = FACES.sleepy;
    const mixv = (a: number, b: number) => a + (b - a) * sleepMix;
    const ex = this.exciteS;
    this.lid.t = mixv(f.lid, sf.lid) + this.pointer.near * 0.04;
    this.wide.t = mixv(f.wide, sf.wide);
    this.pupil.t = mixv(f.pupil, sf.pupil) + this.shine.x * 0.12 + ex * 0.06;
    this.arc.t = mixv(f.arc, sf.arc);
    this.mw.t = mixv(f.mw, sf.mw);
    this.curve.t = mixv(f.curve, sf.curve);
    this.open.t = mixv(f.open, sf.open);
    this.blush.t = mixv(f.blush, sf.blush) + this.tickle * 0.3 + ex * 0.25;
    this.cover.t = f.cover;
    this.slant.t = f.slant;
    this.smirk.t = f.smirk;

    // flame target (unless being stretched — grabMove owns flameBase then)
    const breath = 1 + Math.sin(this.t * 1.5) * 0.03;
    if (!this.grabbing) this.flameBase = mixv(f.flame, sf.flame) * breath;
    // squish shortens the flame a touch, melt makes it sleepy; stress makes it small
    const stressScale = 1 - 0.82 * ss((this.stress - 0.08) / 0.92);
    this.flame.t =
      this.flameBase * clamp(1 - this.squish.x * 0.12 - this.melt.x * 0.25, 0.4, 1.3) * stressScale * this.shrink.x * (1 + ex * 0.12);
    this.glow.t = this.flame.x * Math.min(1.1, Math.max(0, this.fireAmt.x));

    // flame leans away from body motion, bends with the cursor's wind, leans toward a paper
    if (!this.grabbing) {
      const motion = this.lean.v * 0.0016 + this.wobX.v * 0.0016 + this.slide.v * 0.0012 + this.rot.x * 0.55;
      // slow wave → gentle bend, fast wave → dramatic bend
      const windLean = this.windDir * clamp(0.55 * Math.pow(this.windNow, 0.5), 0, 0.92);
      const tremble = Math.sin(this.t * 33) * 0.16 * this.jit;
      this.flameLean.t = clamp(motion + windLean + this.flameAttract + tremble, -0.95, 0.95);
    }

    // melt-driven droop
    if (this.melt.x > 0.02 && !this.grabbing && this.tickle < 0.2) {
      this.lean.t = Math.sin(this.t * 0.8) * this.melt.x * 5;
    }
    this.lean.t = clamp(this.lean.t, -70, 70);

    // breathing (idle life) — never while grabbed, still while frozen
    if (!this.grabbing && this.squish.t === 0 && !this.fallen) {
      if (this.freezeT > 0) {
        this.sy.t = 1;
        this.sx.t = 1;
      } else {
        const amp = this.sleepiness > 0.5 ? 0.016 : 0.01;
        const sp = this.sleepiness > 0.5 ? 1.1 : 1.6;
        this.sy.t = 1 + Math.sin(this.t * sp) * amp;
        this.sx.t = 1 - Math.sin(this.t * sp) * amp * 0.7;
      }
    }

    // ---- integrate (sub-stepped for stability) ----------------------------
    const steps = dt > 0.022 ? 3 : 2;
    const h = dt / steps;
    const springs = [
      this.sx, this.sy, this.lean, this.rot, this.slide, this.wobX, this.wobY,
      this.squish, this.pullX, this.pullY, this.cheekL, this.cheekR,
      this.armL, this.armR, this.armUp, this.armStretch, this.melt,
      this.flame, this.flameLean, this.alive, this.glow, this.fireAmt, this.shrink,
      this.eyeX, this.eyeY, this.lid, this.wide, this.pupil, this.arc,
      this.mw, this.curve, this.open, this.blush, this.tilt,
      this.cover, this.slant, this.smirk, this.nod, this.lookTilt, this.warm, this.shine,
    ];
    for (let i = 0; i < steps; i++) {
      for (const s of springs) s.step(h);
    }

    // hard clamps — stability is king
    this.sx.x = clamp(this.sx.x, 0.55, 1.75);
    this.sy.x = clamp(this.sy.x, 0.5, 1.95);
    this.lean.x = clamp(this.lean.x, -95, 95);
    this.rot.x = clamp(this.rot.x, -1.25, 1.25);
    this.pullX.x = clamp(this.pullX.x, -150, 150);
    this.pullY.x = clamp(this.pullY.x, -170, 170);
    this.wobX.x = clamp(this.wobX.x, -1.6, 1.6);
    this.wobY.x = clamp(this.wobY.x, -1.6, 1.6);
    this.flame.x = clamp(this.flame.x, 0.12, 2.6);
    this.alive.x = clamp(this.alive.x, 0.03, 1.15);
    this.fireAmt.x = clamp(this.fireAmt.x, 0, 1.3);
    this.shrink.x = clamp(this.shrink.x, 0.3, 1.4);
    this.squish.x = clamp(this.squish.x, -0.35, 1.25);
    this.cheekL.x = clamp(this.cheekL.x, -46, 46);
    this.cheekR.x = clamp(this.cheekR.x, -46, 46);
    this.lid.x = clamp(this.lid.x, 0.02, 1.6);
    this.cover.x = clamp(this.cover.x, -0.05, 0.9);
    this.slant.x = clamp(this.slant.x, -1, 1);
    this.smirk.x = clamp(this.smirk.x, -1.2, 1.2);
    this.nod.x = clamp(this.nod.x, -12, 14);
    this.eyeX.x = clamp(this.eyeX.x, -11, 11);
    this.eyeY.x = clamp(this.eyeY.x, -9, 8);
  }
}
