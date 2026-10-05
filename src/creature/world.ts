// ---------------------------------------------------------------------------
// The little room: draggable papers, a cup of tea and a bowl of soup, heat,
// fire, steam, smoke and ash. It also tells the candle what's going on, so the
// creature can pay attention to the things the user is doing.
// Pure numbers — the view paints it every frame.
// ---------------------------------------------------------------------------
import { CandleSim, CX, clamp, rand, pick } from './sim';
import { closedSpline, flamePath, type Pt } from './shape';

export type PaperKind = 'test' | 'dontburn' | 'donttouch' | 'reject' | 'drawing' | 'receipt';
export type WarmKind = 'cup' | 'bowl';

export const FLAT = 0.4; // how squashed a paper looks when it lies on the table
export const MAXF = 5; // burn fronts per paper
export const N_PARTS = 190;
export const N_TONGUES = 34;

export interface Front {
  x: number;
  y: number;
  r: number;
  v: number;
  age: number;
  ph: number;
}

export interface Paper {
  id: number;
  kind: PaperKind;
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rot0: number;
  restY: number;
  lift: number; // 0 lying flat .. 1 face-on in the air
  held: boolean;
  falling: boolean;
  gx: number;
  gy: number;
  ph: number;
  heat: number;
  prox: number;
  hotX: number;
  hotY: number;
  state: 'fresh' | 'burning' | 'gone';
  fronts: Front[];
  drawn: number;
  cover: number;
  covT: number;
  burnAge: number;
  spawnT: number;
  goneT: number;
  curl: number;
  fire: number;
  ashX: number;
  ashY: number;
  excite: number;
}

export interface Warm {
  id: WarmKind;
  w: number;
  h: number;
  x: number; // base centre
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  vtilt: number;
  restY: number;
  held: boolean;
  falling: boolean;
  gx: number;
  gy: number;
  heat: number;
  stage: 0 | 1 | 2 | 3; // cold · warming · hot · perfect
  perfectDone: boolean;
  steamAcc: number;
  px: number;
  py: number;
}

type PKind = 'steam' | 'smoke' | 'ash' | 'ember' | 'twinkle';
interface Part {
  on: boolean;
  kind: PKind;
  painted: PKind | '';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  gr: number;
  rot: number;
  vr: number;
  a: number;
  ph: number;
}
interface Tongue {
  on: boolean;
  x: number;
  y: number;
  life: number;
  max: number;
  h: number;
  w: number;
  ph: number;
}

export interface Geo {
  base: Pt; // wick top
  tip: Pt; // flame tip
  lit: boolean;
  amt: number; // 0..1 how much flame there is
}

export const PAPER_DEFS: { kind: PaperKind; w: number; h: number; x: number; y: number; rot: number }[] = [
  { kind: 'reject', w: 88, h: 114, x: 392, y: 530, rot: 0.34 },
  { kind: 'test', w: 100, h: 128, x: 456, y: 508, rot: -0.2 },
  { kind: 'dontburn', w: 64, h: 60, x: 508, y: 538, rot: 0.22 },
  { kind: 'donttouch', w: 66, h: 54, x: 292, y: 538, rot: 0.1 },
  { kind: 'drawing', w: 90, h: 90, x: -112, y: 526, rot: -0.3 },
  { kind: 'receipt', w: 40, h: 112, x: -160, y: 500, rot: 0.55 },
];

const sgn = (v: number) => (v < 0 ? -1 : 1);

export class World {
  sim: CandleSim;
  t = 0;
  papers: Paper[] = [];
  warms: Warm[] = [];
  parts: Part[] = [];
  tongues: Tongue[] = [];
  order: number[] = [];
  orderDirty = true;
  held: { kind: 'paper' | 'warm'; i: number } | null = null;
  geo: Geo = { base: { x: CX, y: 206 }, tip: { x: CX, y: 130 }, lit: true, amt: 1 };
  pointer = { x: CX, y: 300, vx: 0, vy: 0, present: false };
  lastItem: { x: number; y: number; t: number } = { x: CX + 160, y: 420, t: -99 };
  private lastHeld: { kind: 'paper' | 'warm'; i: number; t: number } | null = null;
  private crackleT = 0;
  private smokeT = 0;

  constructor(sim: CandleSim) {
    this.sim = sim;
    PAPER_DEFS.forEach((d, i) => {
      this.papers.push({
        id: i,
        kind: d.kind,
        w: d.w,
        h: d.h,
        x: d.x,
        y: d.y,
        vx: 0,
        vy: 0,
        rot: d.rot,
        rot0: d.rot,
        restY: d.y,
        lift: 0,
        held: false,
        falling: false,
        gx: 0,
        gy: 0,
        ph: Math.random() * 6.28,
        heat: 0,
        prox: 0,
        hotX: 0,
        hotY: 0,
        state: 'fresh',
        fronts: [],
        drawn: 0,
        cover: 0,
        covT: 0,
        burnAge: 0,
        spawnT: 0,
        goneT: 0,
        curl: 0,
        fire: 0,
        ashX: 0,
        ashY: 0,
        excite: 0,
      });
      this.order.push(i);
    });
    const mk = (id: WarmKind, w: number, h: number, x: number, y: number): Warm => ({
      id,
      w,
      h,
      x,
      y,
      vx: 0,
      vy: 0,
      tilt: 0,
      vtilt: 0,
      restY: y,
      held: false,
      falling: false,
      gx: 0,
      gy: 0,
      heat: 0,
      stage: 0,
      perfectDone: false,
      steamAcc: 0,
      px: x,
      py: y,
    });
    this.warms.push(mk('cup', 62, 46, -22, 497));
    this.warms.push(mk('bowl', 74, 30, 552, 508));
    for (let i = 0; i < N_PARTS; i++) {
      this.parts.push({ on: false, kind: 'steam', painted: '', x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, gr: 0, rot: 0, vr: 0, a: 1, ph: 0 });
    }
    for (let i = 0; i < N_TONGUES; i++) this.tongues.push({ on: false, x: 0, y: 0, life: 0, max: 1, h: 10, w: 4, ph: 0 });
  }

  // ---- geometry helpers ------------------------------------------------------
  private sc(p: Paper) {
    return (0.94 + 0.14 * p.lift) * (1 - 0.12 * p.curl);
  }
  private fl(p: Paper) {
    return FLAT + (1 - FLAT) * p.lift;
  }
  toWorld(p: Paper, lx: number, ly: number): Pt {
    const s = this.sc(p);
    const c = Math.cos(p.rot);
    const sn = Math.sin(p.rot);
    return { x: p.x + (lx * c - ly * sn) * s, y: p.y + (lx * sn + ly * c) * s * this.fl(p) };
  }
  toLocal(p: Paper, wx: number, wy: number): Pt {
    const s = this.sc(p);
    const ux = (wx - p.x) / s;
    const uy = (wy - p.y) / (s * this.fl(p));
    const c = Math.cos(p.rot);
    const sn = Math.sin(p.rot);
    return { x: ux * c + uy * sn, y: -ux * sn + uy * c };
  }
  private flameAt(s: number): Pt {
    return { x: this.geo.base.x + (this.geo.tip.x - this.geo.base.x) * s, y: this.geo.base.y + (this.geo.tip.y - this.geo.base.y) * s };
  }
  /** distance from a paper's nearest point to the flame, and where on the paper that is */
  private paperToFlame(p: Paper): { d: number; lx: number; ly: number } {
    let best = 9999;
    let bx = 0;
    let by = 0;
    const hw = p.w / 2;
    const hh = p.h / 2;
    for (let i = 0; i <= 4; i++) {
      const f = this.flameAt(i / 4);
      const l = this.toLocal(p, f.x, f.y);
      const cx = clamp(l.x, -hw, hw);
      const cy = clamp(l.y, -hh, hh);
      const w = this.toWorld(p, cx, cy);
      const d = Math.hypot(w.x - f.x, w.y - f.y);
      if (d < best) {
        best = d;
        bx = cx;
        by = cy;
      }
    }
    return { d: best, lx: bx, ly: by };
  }

  // ---- hit testing & dragging --------------------------------------------------
  hit(pt: Pt): { kind: 'paper' | 'warm'; i: number } | null {
    for (let k = this.order.length - 1; k >= 0; k--) {
      const p = this.papers[this.order[k]];
      if (p.state === 'gone') continue;
      const l = this.toLocal(p, pt.x, pt.y);
      if (Math.abs(l.x) <= p.w / 2 + 3 && Math.abs(l.y) <= p.h / 2 + 3) return { kind: 'paper', i: p.id };
    }
    for (let i = 0; i < this.warms.length; i++) {
      const w = this.warms[i];
      const lx = pt.x - w.x;
      const ly = pt.y - w.y;
      if (lx >= -w.w / 2 - 6 && lx <= w.w / 2 + 16 && ly >= -w.h - 10 && ly <= 10) return { kind: 'warm', i };
    }
    return null;
  }

  grab(h: { kind: 'paper' | 'warm'; i: number }, pt: Pt) {
    this.held = h;
    this.sim.stimulus(0.6);
    if (h.kind === 'paper') {
      const p = this.papers[h.i];
      p.held = true;
      p.falling = false;
      p.gx = pt.x - p.x;
      p.gy = pt.y - p.y;
      p.vx = 0;
      p.vy = 0;
      this.order = this.order.filter((v) => v !== p.id).concat(p.id);
      this.orderDirty = true;
      this.sim.onSound('paper', 0.6);
      this.sim.noticePaper(p.kind);
    } else {
      const w = this.warms[h.i];
      w.held = true;
      w.falling = false;
      w.gx = pt.x - w.x;
      w.gy = pt.y - w.y;
      w.vx = 0;
      w.vy = 0;
      this.sim.onSound('clink', 0.3);
      this.sim.lookAt('cup', 1.2);
    }
  }

  release() {
    const h = this.held;
    if (!h) return;
    this.held = null;
    const vx = clamp(this.pointer.vx * 0.5, -700, 700);
    const vy = clamp(this.pointer.vy * 0.5, -700, 500);
    if (h.kind === 'paper') {
      const p = this.papers[h.i];
      p.held = false;
      p.falling = true;
      p.vx = vx * 0.5;
      p.vy = vy * 0.3;
      p.restY = p.y > 486 ? clamp(p.y, 486, 540) : 492 + rand(0, 46);
      p.rot0 = rand(-0.45, 0.45);
    } else {
      const w = this.warms[h.i];
      w.held = false;
      w.falling = true;
      w.vx = vx;
      w.vy = vy;
      w.restY = w.y > 494 ? clamp(w.y, 494, 530) : 494 + rand(0, 14);
    }
    this.lastHeld = { ...h, t: this.t };
    this.sim.stimulus(0.4);
  }

  setPointer(x: number, y: number, vx: number, vy: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.vx = vx;
    this.pointer.vy = vy;
    this.pointer.present = true;
  }

  // ---- particles ----------------------------------------------------------------
  private spawn(kind: PKind, x: number, y: number, vx: number, vy: number, max: number, r: number, gr: number, a: number) {
    for (const p of this.parts) {
      if (p.on) continue;
      p.on = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = 0;
      p.max = max;
      p.r = r;
      p.gr = gr;
      p.rot = rand(0, 6.28);
      p.vr = rand(-4, 4);
      p.a = a;
      p.ph = rand(0, 6.28);
      return;
    }
  }
  private spawnTongue(x: number, y: number) {
    for (const t of this.tongues) {
      if (t.on) continue;
      t.on = true;
      t.x = x;
      t.y = y;
      t.life = 0;
      t.max = rand(0.35, 0.75);
      t.h = rand(15, 34);
      t.w = rand(3.6, 6.4);
      t.ph = rand(0, 6.28);
      return;
    }
  }

  // ---- fire ------------------------------------------------------------------------
  private ignite(p: Paper, lx: number, ly: number) {
    p.state = 'burning';
    p.burnAge = 0;
    p.heat = 0;
    p.spawnT = 1.8;
    p.covT = 0;
    p.fronts = [{ x: lx, y: ly, r: 1.2, v: rand(7, 9.5), age: 0, ph: rand(0, 6.28) }];
    this.sim.onSound('ignite', 0.8);
    this.sim.paperIgnited();
    const w = this.toWorld(p, lx, ly);
    for (let i = 0; i < 5; i++) this.spawn('ember', w.x, w.y, rand(-20, 20), rand(-60, -25), rand(0.7, 1.3), rand(1, 1.8), 0, 1);
  }

  private inAnyFront(p: Paper, x: number, y: number, k = 0.9, skip?: Front) {
    for (const f of p.fronts) if (f !== skip && Math.hypot(x - f.x, y - f.y) < f.r * k) return true;
    return false;
  }

  private finish(p: Paper) {
    p.state = 'gone';
    p.goneT = 0;
    if (p.held) {
      p.held = false;
      if (this.held && this.held.kind === 'paper' && this.held.i === p.id) this.held = null;
    }
    p.ashX = p.x;
    p.ashY = p.y > 486 ? clamp(p.y, 486, 540) : 496 + rand(0, 40);
    for (let i = 0; i < 30; i++) {
      const w = this.toWorld(p, rand(-p.w / 2, p.w / 2), rand(-p.h / 2, p.h / 2));
      this.spawn('ash', w.x, w.y, rand(-26, 26), rand(-50, -8), rand(1.8, 3.2), rand(1.4, 2.6), 0, 1);
    }
    for (let i = 0; i < 8; i++) this.spawn('smoke', p.x + rand(-20, 20), p.y + rand(-10, 4), rand(-8, 8), rand(-36, -22), rand(2, 3.2), rand(8, 14), rand(9, 15), 0.42);
    for (let i = 0; i < 8; i++) this.spawn('ember', p.x + rand(-24, 24), p.y + rand(-8, 8), rand(-30, 30), rand(-70, -20), rand(0.7, 1.4), rand(1, 2), 0, 1);
    this.sim.onSound('crumble', 0.7);
    this.sim.paperGone();
  }

  private burn(p: Paper, dt: number) {
    p.burnAge += dt;
    const hw = p.w / 2;
    const hh = p.h / 2;
    for (const f of p.fronts) {
      f.age += dt;
      const ramp = clamp(f.age / 1.1, 0.12, 1);
      f.r += f.v * ramp * dt * (0.85 + 0.3 * Math.sin(f.ph + f.age * 2));
    }
    // the fire spreads: new fronts appear along the burning edge
    p.spawnT -= dt;
    if (p.spawnT <= 0) {
      p.spawnT = rand(1.2, 2.2);
      if (p.fronts.length < MAXF && p.cover < 0.65) {
        const s = pick(p.fronts);
        if (s.r > 10) {
          const a = rand(0, 6.28);
          const nx = s.x + Math.cos(a) * s.r * 0.97;
          const ny = s.y + Math.sin(a) * s.r * 0.97;
          if (Math.abs(nx) < hw && Math.abs(ny) < hh && !this.inAnyFront(p, nx, ny, 0.92, s)) {
            p.fronts.push({ x: nx, y: ny, r: 1.5, v: rand(6.5, 9.5), age: 0, ph: rand(0, 6.28) });
          }
        }
      }
    }
    // how much is gone?
    p.covT -= dt;
    if (p.covT <= 0) {
      p.covT = 0.25;
      let n = 0;
      const NX = 10;
      const NY = 12;
      for (let i = 0; i < NX; i++) {
        for (let j = 0; j < NY; j++) {
          const sx = ((i + 0.5) / NX - 0.5) * p.w;
          const sy = ((j + 0.5) / NY - 0.5) * p.h;
          if (this.inAnyFront(p, sx, sy, 0.92)) n++;
        }
      }
      p.cover = n / (NX * NY);
    }
    p.curl = clamp(p.cover * 1.3 + Math.min(0.2, p.burnAge * 0.03), 0, 1);
    let ringSum = 0;
    for (const f of p.fronts) ringSum += f.r;
    p.fire = clamp(ringSum / 55, 0.15, 1) * (1 - p.cover * 0.75);

    // a paper that's half gone is too hot to hold
    if (p.held && p.cover > 0.55) {
      p.held = false;
      p.falling = true;
      p.restY = p.y > 486 ? clamp(p.y, 486, 540) : 492 + rand(0, 40);
      if (this.held && this.held.kind === 'paper' && this.held.i === p.id) {
        this.held = null;
        this.lastHeld = { kind: 'paper', i: p.id, t: this.t };
      }
    }

    // flames, smoke, ash and embers along the edge
    for (const f of p.fronts) {
      const ring = (inside: boolean) => {
        for (let tries = 0; tries < 3; tries++) {
          const a = rand(0, 6.28);
          const lx = f.x + Math.cos(a) * f.r * 0.94;
          const ly = f.y + Math.sin(a) * f.r * 0.94;
          if (Math.abs(lx) > hw + 1 || Math.abs(ly) > hh + 1) continue;
          if (inside && this.inAnyFront(p, lx, ly, 0.88, f)) continue;
          return this.toWorld(p, lx, ly);
        }
        return null;
      };
      if (f.age > 0.9 && Math.random() < 11 * dt) {
        const w = ring(true);
        if (w) this.spawnTongue(w.x, w.y);
      }
      if (f.age > 0.35 && Math.random() < 5 * dt) {
        const w = ring(false);
        if (w) this.spawn('smoke', w.x, w.y - 4, rand(-6, 6), rand(-36, -22), rand(2, 3.2), rand(5, 9), rand(8, 13), 0.36);
      }
      if (Math.random() < 4 * dt) {
        const w = ring(false);
        if (w) this.spawn('ash', w.x, w.y - 3, rand(-12, 12), rand(-40, -14), rand(1.6, 2.8), rand(1.2, 2.2), 0, 1);
      }
      if (Math.random() < 3 * dt) {
        const w = ring(false);
        if (w) this.spawn('ember', w.x, w.y - 2, rand(-14, 14), rand(-70, -30), rand(0.6, 1.2), rand(0.9, 1.7), 0, 1);
      }
    }

    if (p.cover > 0.86 || p.burnAge > 32) this.finish(p);
  }

  // ---- per-frame update --------------------------------------------------------
  update(dtRaw: number) {
    const dt = clamp(dtRaw, 0.0005, 0.05);
    this.t += dt;
    const sim = this.sim;
    const g = this.geo;
    const lit = g.lit && g.amt > 0.35;
    const mid = this.flameAt(0.45);
    const px = this.pointer.x;
    const py = this.pointer.y;

    // ---- papers -----------------------------------------------------------------
    let burning: Paper | null = null;
    let excite = 0;
    let exciteDir = 0;
    let heldPaper: Paper | null = null;
    for (const p of this.papers) {
      if (p.state === 'gone') {
        p.goneT += dt;
        continue;
      }
      // motion
      if (p.held) {
        const tx = px - p.gx;
        const ty = py - p.gy;
        const ox = p.x;
        p.x += (tx - p.x) * Math.min(1, 16 * dt);
        p.y += (ty - p.y) * Math.min(1, 16 * dt);
        p.vx = (p.x - ox) / dt;
        const rt = clamp(p.vx / 1900, -0.32, 0.32) + Math.sin(this.t * 2.2 + p.ph) * 0.03;
        p.rot += (rt - p.rot) * Math.min(1, 9 * dt);
        p.lift += (1 - p.lift) * Math.min(1, 10 * dt);
        heldPaper = p;
      } else if (p.falling) {
        p.vy += (170 - p.vy) * Math.min(1, 2.4 * dt);
        p.vx *= Math.exp(-2.2 * dt);
        p.x += (p.vx + Math.sin(this.t * 5 + p.ph) * 34) * dt;
        p.y += p.vy * dt;
        p.lift += (clamp((p.restY - p.y) / 140, 0, 1) - p.lift) * Math.min(1, 8 * dt);
        p.rot += (p.rot0 + Math.sin(this.t * 4 + p.ph) * 0.35 * p.lift - p.rot) * Math.min(1, 5 * dt);
        if (p.y >= p.restY) {
          p.y = p.restY;
          p.falling = false;
          p.vx = 0;
          p.vy = 0;
          p.lift = 0;
          this.sim.onSound('paper', 0.3);
        }
      } else {
        p.lift += (0 - p.lift) * Math.min(1, 8 * dt);
      }

      if (p.state === 'fresh') {
        let d = 9999;
        let lx = 0;
        let ly = 0;
        if (lit) {
          const r = this.paperToFlame(p);
          d = r.d;
          lx = r.lx;
          ly = r.ly;
        }
        p.hotX = lx;
        p.hotY = ly;
        const near = lit ? clamp(1 - (d - 6) / 64, 0, 1) : 0;
        p.prox += (near - p.prox) * Math.min(1, 6 * dt);
        if (near > 0.02) p.heat += Math.pow(near, 1.2) * dt * 0.8 * g.amt;
        else p.heat = Math.max(0, p.heat - dt * 0.6);
        p.excite = lit && p.held ? clamp(1 - (d - 8) / 150, 0, 1) : 0;
        if (p.heat >= 1 && lit) this.ignite(p, lx, ly);
        if (p.held && p.excite > excite) {
          excite = p.excite;
          exciteDir = sgn(p.x - mid.x);
        }
      }
      if (p.state === 'burning') {
        this.burn(p, dt);
        if (!burning || p.fire > burning.fire) burning = p;
      }
    }
    if (heldPaper && excite > 0.55) sim.hesitate();

    // ---- warm things (tea, soup) --------------------------------------------------
    let tea = 0;
    let teaX = CX;
    for (let i = 0; i < this.warms.length; i++) {
      const w = this.warms[i];
      if (w.held) {
        const ox = w.x;
        w.x += (px - w.gx - w.x) * Math.min(1, 20 * dt);
        w.y += (py - w.gy - w.y) * Math.min(1, 20 * dt);
        w.vx = (w.x - ox) / dt;
        w.tilt += (clamp(-w.vx * 0.0006, -0.22, 0.22) - w.tilt) * Math.min(1, 8 * dt);
        w.vtilt = 0;
      } else {
        if (w.falling) {
          w.vy += 1500 * dt;
          w.x += w.vx * dt;
          w.y += w.vy * dt;
          w.vx *= Math.exp(-0.8 * dt);
          if (w.y >= w.restY && w.vy > 0) {
            const impact = w.vy;
            w.y = w.restY;
            if (impact > 260) {
              w.vy = -impact * 0.28;
              w.vx *= 0.5;
              w.vtilt = rand(-3, 3);
              sim.onSound('clink', clamp(impact / 900, 0.3, 1));
              if (impact > 380 && Math.abs(w.x - CX) < 360) sim.startle(sgn(w.x - CX));
              this.lastItem = { x: w.x, y: w.y - 20, t: this.t };
            } else {
              w.vy = 0;
              w.vx = 0;
              w.falling = false;
            }
          }
        }
        w.vtilt += (-90 * w.tilt - 9 * w.vtilt) * dt;
        w.tilt += w.vtilt * dt;
      }
      // heat
      const top = { x: w.x, y: w.y - w.h * 0.7 };
      let d = 9999;
      for (let k = 0; k <= 4; k++) {
        const f = this.flameAt(k / 4);
        d = Math.min(d, Math.hypot(top.x - f.x, top.y - f.y));
      }
      const near = lit ? clamp(1 - (d - 20) / 150, 0, 1) : 0;
      if (near > 0.02) w.heat = Math.min(1.05, w.heat + 0.34 * Math.pow(near, 1.3) * g.amt * dt);
      else w.heat = Math.max(0, w.heat - 0.012 * dt);
      const thr = [0.08, 0.5, 0.97];
      const up = w.heat >= thr[2] ? 3 : w.heat >= thr[1] ? 2 : w.heat >= thr[0] ? 1 : 0;
      const prev = w.stage;
      let st: number = w.stage;
      if (up > st) st = up;
      else if (up < st && w.heat < thr[st - 1] - 0.05) st = up;
      w.stage = st as 0 | 1 | 2 | 3;
      if (w.stage < 2) w.perfectDone = false;
      if (w.stage > prev) {
        if (prev < 1 && w.stage >= 1) sim.steamNotice();
        if (prev < 2 && w.stage >= 2) sim.teaHot();
        if (prev < 3 && w.stage === 3 && !w.perfectDone) {
          w.perfectDone = true;
          sim.yum();
        }
      }
      if (w.held || Math.abs(w.x - CX) < 300) {
        if (w.stage > 0 && Math.min(w.stage, 2) > tea) {
          tea = Math.min(w.stage, 2);
          teaX = w.x;
        }
      }
      // steam
      const rate = [0, 1.5, 4.2, 6.8][w.stage];
      if (rate > 0) {
        w.steamAcc += rate * dt;
        while (w.steamAcc >= 1) {
          w.steamAcc -= 1;
          const s = w.stage;
          this.spawn('steam', w.x + rand(-w.w * 0.22, w.w * 0.22), w.y - w.h * 0.96, rand(-4, 4), -rand(18, 30) * (0.8 + s * 0.15), rand(1.5, 2.5) + s * 0.2, 4 + s * 1.2, rand(9, 15) + s * 2, 0.34 + s * 0.12);
          if (s === 3 && Math.random() < 0.35) this.spawn('twinkle', w.x + rand(-18, 18), w.y - w.h - rand(4, 26), rand(-6, 6), -rand(8, 18), rand(0.8, 1.4), rand(1.4, 2.4), 0, 1);
        }
      }
      w.px = w.x;
      w.py = w.y;
    }

    // ---- wick smoke when the flame has just been blown out -------------------------
    if (sim.smokeReq > 0) {
      for (let i = 0; i < sim.smokeReq; i++) this.spawn('smoke', g.base.x + rand(-3, 3), g.base.y - 4 - i * 4, rand(-6, 6), -rand(26, 42), rand(2.2, 3.2), rand(4, 7), rand(7, 12), 0.5);
      sim.smokeReq = 0;
    }
    if (sim.wickSmoke > 0) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.09;
        this.spawn('smoke', g.base.x + rand(-1.5, 1.5), g.base.y - 3, rand(-4, 4), -rand(22, 34), rand(2.2, 3.4), rand(2.6, 4.4), rand(6, 10), 0.34 * clamp(sim.wickSmoke, 0, 1));
      }
    }

    // a burning scrap can light the wick again
    if (!sim.lit) {
      for (const t of this.tongues) {
        if (t.on && Math.hypot(t.x - g.base.x, t.y - g.base.y) < 30) {
          sim.relight();
          break;
        }
      }
    }

    // ---- particles & tongues ----------------------------------------------------------
    for (const p of this.parts) {
      if (!p.on) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.on = false;
        continue;
      }
      switch (p.kind) {
        case 'steam':
          p.vx += (Math.sin(this.t * 2 + p.ph) * 12 - p.vx * 0.9) * dt;
          p.r += p.gr * dt;
          break;
        case 'smoke':
          p.vx += (Math.sin(this.t * 1.7 + p.ph) * 14 - p.vx * 0.6) * dt;
          p.vy *= Math.exp(-0.25 * dt);
          p.r += p.gr * dt;
          break;
        case 'ash':
          p.vy += 16 * dt;
          p.vx += (Math.sin(this.t * 3 + p.ph) * 22 - p.vx * 0.8) * dt;
          p.rot += p.vr * dt;
          break;
        case 'ember':
          p.vy -= 10 * dt;
          p.vx += (Math.random() - 0.5) * 120 * dt;
          break;
        case 'twinkle':
          p.vx += (Math.sin(this.t * 4 + p.ph) * 10 - p.vx) * dt;
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const tg of this.tongues) {
      if (!tg.on) continue;
      tg.life += dt;
      if (tg.life >= tg.max) {
        tg.on = false;
        continue;
      }
      tg.y -= 14 * dt;
      tg.x += Math.sin(this.t * 9 + tg.ph) * 6 * dt;
    }
    // little crackles while anything burns
    if (burning) {
      this.crackleT -= dt;
      if (this.crackleT <= 0) {
        this.crackleT = rand(0.12, 0.45);
        sim.onSound('crackle', 0.5 * burning.fire);
      }
    }

    // ---- tell the candle what's happening ---------------------------------------------
    const heldItem = this.held;
    sim.excite = heldPaper && heldPaper.state === 'fresh' ? excite : 0;
    sim.exciteDir = exciteDir;
    sim.burnWatch = !!burning && sim.lit;
    sim.tea = tea;
    sim.flameAttract = 0;
    if (sim.excite > 0.05) sim.flameAttract = exciteDir * 0.42 * sim.excite;
    else if (this.pointer.present) sim.flameAttract = clamp((px - g.base.x) / 320, -0.4, 0.4) * 0.07;
    sim.leanBias = 0;
    if (burning) {
      const f = burning.fronts[0];
      const bw = f ? this.toWorld(burning, f.x, f.y) : { x: burning.x, y: burning.y };
      sim.pos.paper = { x: bw.x, y: bw.y };
      sim.leanBias = clamp((bw.x - CX) / 26, -1, 1) * 11;
    } else if (heldPaper) {
      sim.pos.paper = { x: heldPaper.x, y: heldPaper.y };
      if (sim.excite > 0.4) sim.leanBias = exciteDir * 8 * sim.excite;
    } else {
      // nearest untouched paper
      let best: Paper | null = null;
      let bd = 1e9;
      for (const p of this.papers) {
        if (p.state !== 'fresh') continue;
        const d = Math.hypot(p.x - CX, p.y - 330);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (best) sim.pos.paper = { x: best.x, y: best.y };
    }
    if (tea > 0) sim.leanBias = sim.leanBias || clamp((teaX - CX) / 40, -1, 1) * 7;
    const cupW = this.warms.find((w) => w.held) ?? this.warms[0];
    sim.pos.cup = { x: cupW.x, y: cupW.y - cupW.h * 0.6 };
    sim.pos.flame = mid;
    sim.pos.wick = { x: g.base.x, y: g.base.y };

    // what is the user playing with? the candle's eyes go there
    if (heldItem) {
      const it = heldItem.kind === 'paper' ? this.papers[heldItem.i] : this.warms[heldItem.i];
      this.lastItem = { x: it.x, y: heldItem.kind === 'warm' ? it.y - 24 : it.y, t: this.t };
    } else if (this.lastHeld && this.t - this.lastHeld.t < 1.4) {
      const it = this.lastHeld.kind === 'paper' ? this.papers[this.lastHeld.i] : this.warms[this.lastHeld.i];
      if (this.lastHeld.kind === 'paper' ? (it as Paper).state !== 'gone' : true) {
        this.lastItem = { x: it.x, y: this.lastHeld.kind === 'warm' ? it.y - 24 : it.y, t: this.t };
      }
    }
    sim.pos.item = { x: this.lastItem.x, y: this.lastItem.y };

    const interesting: string[] = [];
    if (this.papers.some((p) => p.state === 'fresh')) interesting.push('paper');
    interesting.push('cup');
    sim.interesting = interesting;
    sim.schemeOK = sim.lit && this.papers.some((p) => p.state === 'fresh');

    // attention: burning thing > held thing > thing just let go > distressed flame > cursor near flame
    const distF = Math.hypot(px - mid.x, py - mid.y);
    const distFace = Math.hypot(px - CX, py - 344);
    if (burning && sim.lit) {
      sim.setFocus('paper', sim.pos.paper.x, sim.pos.paper.y);
    } else if (heldItem) {
      sim.setFocus('item', this.lastItem.x, this.lastItem.y);
    } else if (this.lastHeld && this.t - this.lastHeld.t < 1.4) {
      sim.setFocus('item', this.lastItem.x, this.lastItem.y);
    } else if (sim.lit && sim.stress > 0.1) {
      sim.setFocus('flame', mid.x, mid.y);
    } else if (this.pointer.present && sim.lit && distF < 125 && distF < distFace) {
      sim.setFocus('flame', mid.x, mid.y);
    } else {
      sim.setFocus('none');
    }
  }

  // ---- painting ---------------------------------------------------------------------
  paint(R: Record<string, SVGElement | null>) {
    const set = (k: string, a: string, v: string) => {
      const el = R[k];
      if (el) el.setAttribute(a, v);
    };
    const f1 = (n: number) => n.toFixed(1);

    // z-order of papers
    if (this.orderDirty) {
      this.orderDirty = false;
      for (const id of this.order) {
        const el = R[`p${id}`];
        if (el && el.parentNode) el.parentNode.appendChild(el);
      }
    }

    for (const p of this.papers) {
      const gEl = R[`p${p.id}`];
      if (!gEl) continue;
      // ash pile (persists)
      if (p.state === 'gone') {
        const a = clamp(p.goneT / 1.2, 0, 1);
        set(`pa${p.id}`, 'opacity', (a * 0.92).toFixed(2));
        set(`pa${p.id}`, 'transform', `translate(${f1(p.ashX)} ${f1(p.ashY)}) rotate(${(p.rot0 * 20).toFixed(1)})`);
        const k = 1 - clamp(p.goneT / 0.7, 0, 1);
        set(`p${p.id}`, 'opacity', k.toFixed(2));
        if (k <= 0) set(`p${p.id}`, 'display', 'none');
        set(`ps${p.id}`, 'opacity', '0');
        set(`pg${p.id}`, 'opacity', '0');
        if (k > 0) this.paintPaper(p, set);
        continue;
      }
      this.paintPaper(p, set);
    }

    // warm things
    for (const w of this.warms) {
      set(`w${w.id}`, 'transform', `translate(${f1(w.x)} ${f1(w.y)}) rotate(${(w.tilt * 57.3).toFixed(2)})`);
      const hot = clamp(w.heat, 0, 1);
      set(`w${w.id}g`, 'opacity', (hot * 0.5).toFixed(3));
      set(`w${w.id}h`, 'opacity', (0.25 + hot * 0.75).toFixed(3)); // liquid warms up
      set(`w${w.id}s`, 'opacity', (clamp((w.y - 470) / 40, 0, 1) * 0.5).toFixed(2));
      set(`w${w.id}s`, 'transform', `translate(${f1(w.x)} ${f1(Math.max(w.restY, 494) + 2)}) scale(${(1 - clamp((494 - w.y) / 300, 0, 0.4)).toFixed(3)} 1)`);
    }

    // particles
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      const key = `pt${i}`;
      const el = R[key];
      if (!el) continue;
      if (!p.on) {
        if (p.painted !== '') {
          el.setAttribute('opacity', '0');
          p.painted = '';
        }
        continue;
      }
      if (p.painted !== p.kind) {
        p.painted = p.kind;
        el.setAttribute(
          'fill',
          p.kind === 'steam' ? 'url(#steamG)' : p.kind === 'smoke' ? 'url(#smokeG)' : p.kind === 'ash' ? '#241810' : p.kind === 'ember' ? '#ffae3c' : '#fff1bf',
        );
      }
      const k = p.life / p.max;
      let a = 1;
      let sx = p.r;
      let sy = p.r;
      if (p.kind === 'steam') a = p.a * Math.pow(Math.sin(Math.PI * k), 0.8);
      else if (p.kind === 'smoke') a = p.a * Math.pow(1 - k, 1.3) * Math.min(1, k * 7);
      else if (p.kind === 'ash') {
        a = (1 - k * k * k) * 0.95;
        sx = p.r * (1 + 0.5 * Math.sin(this.t * 9 + p.ph));
        sy = p.r * 0.55;
      } else if (p.kind === 'ember') {
        a = (1 - k) * (0.6 + 0.4 * Math.sin(this.t * 40 + p.ph));
        sx = sy = p.r * (1 - k * 0.5);
      } else {
        a = Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.sin(this.t * 14 + p.ph));
        sx = sy = p.r;
      }
      el.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)}) rotate(${((p.kind === 'ash' ? p.rot : 0) * 57.3).toFixed(0)}) scale(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      el.setAttribute('opacity', clamp(a, 0, 1).toFixed(3));
    }

    // flames on burning paper
    for (let i = 0; i < this.tongues.length; i++) {
      const tg = this.tongues[i];
      if (!tg.on) {
        if (R[`tg${i}`]?.getAttribute('opacity') !== '0') set(`tg${i}`, 'opacity', '0');
        continue;
      }
      const k = tg.life / tg.max;
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, k)), 0.7);
      const h = tg.h * env;
      const bend = Math.sin(this.t * 7 + tg.ph) * 0.12 + this.sim.windDir * 0.1;
      set(`tg${i}`, 'transform', `translate(${f1(tg.x)} ${f1(tg.y)})`);
      set(`tg${i}`, 'opacity', '1');
      set(`tgo${i}`, 'd', flamePath(Math.max(2, h), tg.w, bend, this.t + tg.ph));
      set(`tgm${i}`, 'd', flamePath(Math.max(1.5, h * 0.62), tg.w * 0.55, bend * 0.8, this.t * 1.3 + tg.ph));
    }
  }

  private paintPaper(p: Paper, set: (k: string, a: string, v: string) => void) {
    const s = this.sc(p);
    const f = this.fl(p);
    const id = p.id;
    set(`p${id}`, 'transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${s.toFixed(3)} ${(s * f).toFixed(3)}) rotate(${(p.rot * 57.3).toFixed(2)})`);
    // soft shadow on the table
    const shY = p.held || p.falling ? Math.max(p.restY, 494) : p.y;
    set(`ps${id}`, 'transform', `translate(${p.x.toFixed(1)} ${(p.y + (shY - p.y) * p.lift + 2).toFixed(1)}) scale(${(p.w * (0.55 - 0.13 * p.lift)).toFixed(1)} ${(p.h * FLAT * 0.55 * (1 - p.lift) + 8 * p.lift).toFixed(1)})`);
    set(`ps${id}`, 'opacity', (0.5 - 0.25 * p.lift).toFixed(2));

    // scorch + glowing edge just before it catches
    set(`pd${id}`, 'opacity', clamp(p.heat * 0.4 + p.cover * 0.55, 0, 0.9).toFixed(3));
    const hot = p.state === 'fresh' ? p.heat * p.heat : 0;
    set(`ph${id}`, 'opacity', clamp(hot * 1.2, 0, 1).toFixed(3));
    set(`ph${id}`, 'transform', `translate(${p.hotX.toFixed(1)} ${p.hotY.toFixed(1)}) scale(${(6 + p.heat * 12).toFixed(1)})`);

    // burn fronts
    const n = p.fronts.length;
    for (let k = 0; k < MAXF; k++) {
      if (k < n) {
        const fr = p.fronts[k];
        set(`hole${id}_${k}`, 'd', blob(fr, fr.r));
        set(`holeS${id}_${k}`, 'd', blob(fr, Math.max(0, fr.r - 3.2)));
        set(`char${id}_${k}`, 'd', blob(fr, fr.r + 5 + Math.min(4, fr.r * 0.25)));
        const edge = blob(fr, fr.r + 0.5);
        set(`glow${id}_${k}`, 'd', edge);
        set(`core${id}_${k}`, 'd', edge);
      } else if (k < p.drawn) {
        set(`hole${id}_${k}`, 'd', '');
        set(`holeS${id}_${k}`, 'd', '');
        set(`char${id}_${k}`, 'd', '');
        set(`glow${id}_${k}`, 'd', '');
        set(`core${id}_${k}`, 'd', '');
      }
    }
    p.drawn = n;
    // flicker of the burning edge + light on the table
    const fl = 0.75 + 0.25 * Math.sin(this.t * 23 + id) * Math.sin(this.t * 11 + id * 2);
    set(`rings${id}`, 'opacity', (p.state === 'burning' ? fl : 0).toFixed(3));
    set(`pg${id}`, 'transform', `translate(${p.x.toFixed(1)} ${(p.y - 8).toFixed(1)}) scale(${(p.w * 0.9).toFixed(1)} ${(p.w * 0.7).toFixed(1)})`);
    set(`pg${id}`, 'opacity', (p.fire * 0.55 * fl).toFixed(3));
  }
}

function blob(f: Front, rr: number): string {
  if (rr <= 0.05) return '';
  const N = 14;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + 0.17 * Math.sin(a * 3 + f.ph) + 0.1 * Math.sin(a * 5 + f.ph * 1.7) + 0.05 * Math.sin(a * 8 + f.ph * 0.6);
    const r = rr * k;
    pts.push({ x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r });
  }
  return closedSpline(pts);
}
