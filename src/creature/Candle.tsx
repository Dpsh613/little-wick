import { useEffect, useRef } from 'react';
import { CandleSim, CX, BCY, GROUND, TOPY, BODY_H, clamp } from './sim';
import {
  BODY_BASE,
  CAP_N,
  capDepth,
  closedSpline,
  openSpline,
  DRIPS,
  PUDDLE_BASE,
  flamePath,
  outlineXAt,
  baseRadius,
  type Pt,
} from './shape';
import { play } from '../audio';
import { World } from './world';
import { WorldBack, WorldFx, WorldItems } from './WorldView';

// the viewBox is wider than the candle itself so there's room for the little
// workspace on both sides — candle coordinates are unchanged
const VBX = -190;
const VBW = 800;
const VBH = 560;

const FACE_A = { x: CX, y: 344 };
const EYE_L = { x: CX - 50, y: 332 };
const EYE_R = { x: CX + 50, y: 332 };
const CHEEK_L = { x: CX - 80, y: 370 };
const CHEEK_R = { x: CX + 80, y: 370 };
const MOUTH = { x: CX, y: 374 };
const ARM_L = { x: CX - 82, y: 404 };
const ARM_R = { x: CX + 82, y: 404 };

type Deform = (x: number, y: number) => Pt;

function makeDeform(s: CandleSim): Deform {
  const sq = s.squish.x;
  const spx = s.squishPX;
  const spy = s.squishPY;
  const cl = s.cheekL.x;
  const cr = s.cheekR.x;
  const px = s.pullX.x;
  const py = s.pullY.x;
  const pax = s.pullAX;
  const pay = s.pullAY;
  const melt = s.melt.x;
  const sx = s.sx.x;
  const sy = s.sy.x;
  const lean = s.lean.x + s.wobX.x * 15;
  const bob = s.wobY.x * 5;
  const slide = s.slide.x;
  const rot = s.rot.x;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  return (ix: number, iy: number): Pt => {
    let x = ix;
    let y = iy;

    // localised press (belly squish / boop dent)
    if (sq > 0.002 || sq < -0.002) {
      const dx = x - spx;
      const dy = (y - spy) * 1.15;
      const g = Math.exp(-(dx * dx + dy * dy) / 12168);
      const q = sq * g;
      y = spy + (y - spy) * (1 - 0.42 * q);
      x = spx + (x - spx) * (1 + 0.3 * q);
    }

    // cheek pulls
    if (cl !== 0) {
      const dx = x - CHEEK_L.x;
      const dy = (y - CHEEK_L.y) * 1.35;
      const g = Math.exp(-(dx * dx + dy * dy) / 5000);
      x += cl * g;
      y += cl * g * 0.07;
    }
    if (cr !== 0) {
      const dx = x - CHEEK_R.x;
      const dy = (y - CHEEK_R.y) * 1.35;
      const g = Math.exp(-(dx * dx + dy * dy) / 5000);
      x += cr * g;
      y -= cr * g * 0.07;
    }

    // grab / stretch — the melted foot stays glued to the table
    if (px !== 0 || py !== 0) {
      const dx = x - pax;
      const dy = (y - pay) * 0.85;
      const f = Math.exp(-(dx * dx + dy * dy) / 24200);
      const hh = clamp((GROUND - iy) / BODY_H, 0, 1);
      const anchor = hh * hh * (3 - 2 * hh);
      x += px * f * (0.1 + 0.9 * anchor);
      y += py * f * (0.05 + 0.95 * anchor);
    }

    // melt state: spread + flatten
    if (melt > 0.001) {
      x = CX + (x - CX) * (1 + 0.22 * melt);
      y = GROUND - (GROUND - y) * (1 - 0.24 * melt);
    }

    // global squash & stretch about the grounded puddle
    x = CX + (x - CX) * sx;
    y = GROUND - (GROUND - y) * sy;

    // lean / secondary jiggle (upper body moves most, wax foot stays put)
    const hh2 = clamp((GROUND - y) / BODY_H, 0, 1.7);
    const hs = Math.min(hh2, 1);
    const sf = hh2 * hs * (3 - 2 * hs) * 0.92;
    x += lean * sf;
    y += bob * sf;

    // slide + tip over around the contact point
    x += slide;
    const rx0 = x - (CX + slide);
    const ry0 = y - GROUND;
    let fx = CX + slide + rx0 * cosR - ry0 * sinR;
    let fy = GROUND + rx0 * sinR + ry0 * cosR;

    // soft ground contact: wax never sinks through the table, it spreads
    const over = fy - (GROUND + 2);
    if (over > 0) {
      fy = GROUND + 2 + over * 0.07;
      fx += (fx > CX + slide ? 1 : -1) * Math.min(over, 90) * 0.28;
    }
    return { x: fx, y: fy };
  };
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

export default function Candle({
  onLight,
  onFirstInteract,
}: {
  onLight?: (v: number, cx: number, cy: number) => void;
  onFirstInteract?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const R = useRef<Record<string, SVGElement | null>>({});
  const simRef = useRef<CandleSim>(null as unknown as CandleSim);
  if (!simRef.current) {
    simRef.current = new CandleSim();
    simRef.current.onSound = (n, p) => play(n, p ?? 0.6);
  }
  const worldRef = useRef<World>(null as unknown as World);
  if (!worldRef.current) worldRef.current = new World(simRef.current);
  const hitRef = useRef({
    flame: { x: CX, y: TOPY - 60 },
    wick: { x: CX, y: TOPY - 24 },
    face: { x: CX, y: 344 },
    cheekL: { x: CHEEK_L.x, y: CHEEK_L.y },
    cheekR: { x: CHEEK_R.x, y: CHEEK_R.y },
    armL: { x: ARM_L.x, y: ARM_L.y },
    armR: { x: ARM_R.x, y: ARM_R.y },
    belly: { x: CX, y: 395 },
    center: { x: CX, y: BCY },
    rx: 140,
    ry: 135,
  });

  useEffect(() => {
    const sim = simRef.current;
    const world = worldRef.current;
    const svg = svgRef.current!;
    const sparks: Spark[] = [];
    const G = {
      down: false,
      mode: '' as string,
      region: 'none',
      sx: 0,
      sy: 0,
      lx: 0,
      ly: 0,
      lt: 0,
      vx: 0,
      vy: 0,
      moved: 0,
      t0: 0,
      timer: 0,
      rev: 0,
      revT: 0,
      dirX: 0,
      pid: -1,
      tapT: 0,
      tapX: 0,
      tapY: 0,
    };
    let rect = svg.getBoundingClientRect();
    const refreshRect = () => (rect = svg.getBoundingClientRect());
    window.addEventListener('resize', refreshRect);
    window.addEventListener('scroll', refreshRect, true);

    const toSvg = (cx: number, cy: number) => {
      const scale = Math.min(rect.width / VBW, rect.height / VBH);
      const ox = (rect.width - VBW * scale) / 2;
      const oy = (rect.height - VBH * scale) / 2;
      return { x: (cx - rect.left - ox) / scale + VBX, y: (cy - rect.top - oy) / scale };
    };
    const d2 = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

    const regionAt = (p: { x: number; y: number }) => {
      const h = hitRef.current;
      if (sim.lit && d2(p, h.flame) < 58) return 'flame';
      if (!sim.lit && d2(p, h.wick) < 48) return 'wick';
      if (d2(p, h.armL) < 32) return 'armL';
      if (d2(p, h.armR) < 32) return 'armR';
      if (d2(p, h.cheekL) < 36) return 'cheekL';
      if (d2(p, h.cheekR) < 36) return 'cheekR';
      if (d2(p, h.face) < 74) return 'face';
      const ex = (p.x - h.center.x) / h.rx;
      const ey = (p.y - h.center.y) / h.ry;
      if (ex * ex + ey * ey < 1.05) return 'body';
      return 'none';
    };

    const firstTouch = () => {
      if (!sim.hasInteracted) onFirstInteract?.();
    };

    const onDown = (e: PointerEvent) => {
      refreshRect();
      const p = toSvg(e.clientX, e.clientY);

      // things on the table come first: papers, tea, soup
      const item = world.hit(p);
      if (item) {
        e.preventDefault();
        firstTouch();
        svg.setPointerCapture(e.pointerId);
        G.pid = e.pointerId;
        G.down = true;
        G.mode = 'item';
        G.region = 'item';
        G.lx = p.x;
        G.ly = p.y;
        G.lt = performance.now();
        G.vx = 0;
        G.vy = 0;
        sim.setPointer(p.x, p.y, true);
        world.setPointer(p.x, p.y, 0, 0);
        world.grab(item, p);
        svg.style.cursor = 'grabbing';
        return;
      }

      const region = regionAt(p);
      if (region === 'none') return;
      e.preventDefault();
      firstTouch();

      // touching the wick of a sad dark candle relights it
      if (region === 'wick') {
        sim.relight();
        return;
      }

      svg.setPointerCapture(e.pointerId);
      G.pid = e.pointerId;
      G.down = true;
      G.region = region;
      G.sx = p.x;
      G.sy = p.y;
      G.lx = p.x;
      G.ly = p.y;
      G.lt = performance.now();
      G.moved = 0;
      G.t0 = performance.now();
      G.vx = 0;
      G.vy = 0;
      sim.setPointer(p.x, p.y, true);
      if (region === 'flame') {
        G.mode = 'flame';
        const now = performance.now();
        const dir = Math.sign(hitRef.current.flame.x - p.x) || (Math.random() < 0.5 ? -1 : 1);
        if (now - G.tapT < 420 && Math.hypot(p.x - G.tapX, p.y - G.tapY) < 70) {
          G.tapT = 0;
          sim.flameDouble(dir); // double click: HEY. Don't touch that.
        } else {
          G.tapT = now;
          G.tapX = p.x;
          G.tapY = p.y;
          sim.flameTap(dir);
        }
        return;
      }
      G.mode = 'pending';
      window.clearTimeout(G.timer);
      G.timer = window.setTimeout(() => {
        if (G.mode === 'pending' && G.moved < 14) {
          G.mode = 'press';
          sim.pressStart(G.lx, G.ly);
        }
      }, 230);
    };

    const onMove = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      const now = performance.now();
      const dt = Math.max(0.004, (now - G.lt) / 1000);
      const dx = p.x - G.lx;
      const dy = p.y - G.ly;
      const sp = Math.hypot(dx, dy) / dt;
      G.vx = G.vx * 0.6 + (dx / dt) * 0.4;
      G.vy = G.vy * 0.6 + (dy / dt) * 0.4;
      G.lx = p.x;
      G.ly = p.y;
      G.lt = now;
      G.moved += Math.hypot(dx, dy);
      sim.setPointer(p.x, p.y, G.down);
      world.setPointer(p.x, p.y, G.vx, G.vy);

      const h = hitRef.current;

      // --- waving the cursor around the flame is wind ---------------------
      // slow → gentle bend, fast → dramatic bend, sustained → struggles, then goes out
      const df = d2(p, h.flame);
      if (sim.lit && df < 150 && sp > 60) {
        firstTouch();
        const prox = Math.pow(clamp(1 - df / 150, 0, 1), 0.8);
        sim.flameWindIn(clamp(sp / 1900, 0, 1.2) * prox, Math.sign(dx) || 1);
      }

      // --- hover feedback: things you can grab / the wick ---------------------
      if (!G.down) {
        const rg = regionAt(p);
        svg.style.cursor = world.hit(p) ? 'grab' : rg === 'flame' || rg === 'wick' ? 'pointer' : '';
      }

      // --- tickling: fast back-and-forth over the belly -------------------
      const inBelly = d2(p, h.belly) < 105;
      if (inBelly && sp > 170 && !sim.fallen && G.mode !== 'item') {
        const s = Math.sign(dx);
        if (s !== 0 && s !== G.dirX && Math.abs(dx) > 2.5) {
          G.dirX = s;
          G.rev++;
          G.revT = 0.6;
        }
        if (G.rev >= 3) {
          firstTouch();
          sim.addTickle(0.05 * clamp(sp / 800, 0.4, 1.7));
          if (G.mode === 'pending') {
            window.clearTimeout(G.timer);
            G.mode = 'tickle';
          } else if (G.mode === 'stretch' && Math.hypot(p.x - G.sx, p.y - G.sy) < 70) {
            sim.grabEnd(0, 0);
            G.mode = 'tickle';
          } else if (G.mode === 'press' && G.rev >= 5) {
            sim.pressEnd();
            G.mode = 'tickle';
          }
        }
      }

      if (!G.down) return;
      e.preventDefault();

      if (G.mode === 'pending' && G.moved > 13) {
        window.clearTimeout(G.timer);
        if (G.region === 'cheekL' || G.region === 'cheekR') G.mode = 'cheek';
        else if (G.region === 'armL' || G.region === 'armR') G.mode = 'arm';
        else {
          G.mode = 'stretch';
          sim.grabStart(G.sx, G.sy);
        }
      }

      if (G.mode === 'stretch') sim.grabMove(p.x - G.sx, p.y - G.sy);
      else if (G.mode === 'cheek') sim.cheekPull(G.region === 'cheekL' ? -1 : 1, p.x - G.sx);
      else if (G.mode === 'arm') sim.armTug(G.region === 'armL' ? -1 : 1, p.x - G.sx);
      else if (G.mode === 'press') sim.pressMove(p.x, p.y);
    };

    const onUp = (e: PointerEvent) => {
      if (!G.down) return;
      const p = toSvg(e.clientX, e.clientY);
      window.clearTimeout(G.timer);
      try {
        svg.releasePointerCapture(G.pid);
      } catch {
        /* noop */
      }
      const mode = G.mode;
      G.down = false;
      G.mode = '';
      sim.setPointer(p.x, p.y, false);

      if (mode === 'item') {
        world.setPointer(p.x, p.y, G.vx, G.vy);
        world.release();
        svg.style.cursor = '';
        return;
      }
      if (mode === 'flame') return;

      if (mode === 'pending') {
        if (G.region === 'cheekL') sim.cheekPoke(-1, p.x, p.y);
        else if (G.region === 'cheekR') sim.cheekPoke(1, p.x, p.y);
        else if (G.region === 'armL' || G.region === 'armR') {
          const side = G.region === 'armL' ? -1 : 1;
          sim.armTug(side as -1 | 1, side * 15);
          window.setTimeout(() => sim.armRelease(), 130);
        } else sim.boop(p.x, p.y);
      } else if (mode === 'press') sim.pressEnd();
      else if (mode === 'stretch') sim.grabEnd(G.vx, G.vy);
      else if (mode === 'cheek') sim.cheekRelease();
      else if (mode === 'arm') sim.armRelease();
    };

    const onLeave = () => {
      if (!G.down) sim.pointerLeft();
    };

    svg.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    svg.addEventListener('pointerleave', onLeave);

    // ---------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    let announced = false;

    const set = (k: string, a: string, v: string) => {
      const el = R.current[k];
      if (el) el.setAttribute(a, v);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (G.revT > 0) {
        G.revT -= dt;
        if (G.revT <= 0) G.rev = 0;
      }
      sim.update(dt);
      if (!announced && sim.hasInteracted) {
        announced = true;
        onFirstInteract?.();
      }
      const t = sim.t;
      const D = makeDeform(sim);

      // ---- body ---------------------------------------------------------
      const body: Pt[] = BODY_BASE.map((p) => D(p.x, p.y));
      set('body', 'd', closedSpline(body));
      set('bodyEdge', 'd', closedSpline(body));

      // ---- puddle (anchoring melted foot) --------------------------------
      const spread = 1 + (sim.sx.x - 1) * 0.55 + sim.melt.x * 0.2 + sim.squish.x * 0.07;
      const pud: Pt[] = PUDDLE_BASE.map((p) => ({
        x: CX + sim.slide.x + p.x * 152 * spread + Math.sin(t * 1.3 + p.x * 3) * 1.2,
        y: GROUND - 12 + p.y * 24 * (1 + sim.melt.x * 0.15),
      }));
      set('puddle', 'd', closedSpline(pud));
      set('puddle2', 'd', closedSpline(pud.map((p) => ({ x: CX + sim.slide.x + (p.x - CX - sim.slide.x) * 0.76, y: GROUND - 14 + (p.y - GROUND + 12) * 0.7 }))));

      // ---- wax cap + drips ------------------------------------------------
      const capOuter: Pt[] = [];
      const capInner: Pt[] = [];
      for (let i = 0; i <= CAP_N; i++) {
        const u = i / CAP_N;
        const a = Math.PI + u * Math.PI;
        const b = baseRadius(a);
        capOuter.push(D(b.x, b.y));
        const depth = capDepth(u) * (1 + sim.melt.x * 0.25);
        const ny = b.y + depth;
        const side = b.x < CX ? -1 : 1;
        // only wax near the silhouette edge wraps around the body; the rest runs straight down
        const hugAmt = Math.pow(Math.abs(Math.cos(a)), 1.5);
        const hug = outlineXAt(ny, side);
        const nx = b.x + (hug - b.x) * 0.82 * hugAmt;
        capInner.push(D(nx, ny));
      }
      capInner.reverse();
      set('cap', 'd', openSpline(capOuter.concat(capInner), true));

      // drips
      DRIPS.forEach((dp, i) => {
        const a = Math.PI + dp.u * Math.PI;
        const b = baseRadius(a);
        const d0 = capDepth(dp.u) * (1 + sim.melt.x * 0.2);
        const side = b.x < CX ? -1 : 1;
        const hugAmt = Math.pow(Math.abs(Math.cos(a)), 1.5);
        const y0 = b.y + d0 * 0.8;
        const x0 = b.x + (outlineXAt(y0, side) - b.x) * 0.82 * hugAmt;
        const wob = Math.sin(t * 1.7 + dp.phase) * 1.6 + sim.wobX.x * 5 + sim.melt.x * 6 * side;
        const L = dp.len * (1 + sim.melt.x * 0.35 + Math.sin(t * 1.1 + dp.phase) * 0.03);
        const pts: Pt[] = [];
        const w = dp.w;
        const prof = [0, 0.35, 0.68, 0.88, 1];
        const colAt = (u: number) => {
          const yy = y0 + L * u;
          const hugx = outlineXAt(yy, side);
          const cxx = x0 + (hugx - x0) * 0.75 * hugAmt + wob * u * u;
          const ww = w * (1 - 0.25 * u + 0.22 * Math.sin(u * 3.1)) * (u === 1 ? 0.18 : 1);
          return { yy, cxx, ww };
        };
        for (const u of prof) {
          const c = colAt(u);
          pts.push({ x: c.cxx - c.ww, y: c.yy });
        }
        for (let k = prof.length - 1; k >= 0; k--) {
          const c = colAt(prof[k]);
          pts.push({ x: c.cxx + c.ww, y: c.yy });
        }
        set(`drip${i}`, 'd', openSpline(pts.map((p) => D(p.x, p.y)), true));
      });

      // ---- face frame (linear approximation of the local deformation) -----
      const A = FACE_A;
      const d0 = D(A.x, A.y);
      const dxp = D(A.x + 9, A.y);
      const dyp = D(A.x, A.y + 9);
      const damp = 0.82;
      let j11 = 1 + ((dxp.x - d0.x) / 9 - 1) * damp;
      let j21 = ((dxp.y - d0.y) / 9) * damp;
      let j12 = ((dyp.x - d0.x) / 9) * damp;
      let j22 = 1 + ((dyp.y - d0.y) / 9 - 1) * damp;
      j11 = clamp(j11, 0.62, 1.7);
      j22 = clamp(j22, 0.62, 1.8);
      j12 = clamp(j12, -0.55, 0.55);
      j21 = clamp(j21, -0.55, 0.55);
      const ee = d0.x - (j11 * A.x + j12 * A.y);
      const ff = d0.y - (j21 * A.x + j22 * A.y);
      // head turns a touch toward what it's watching, nods when proud
      const eeH = ee + sim.eyeX.x * 0.5;
      const ffH = ff + sim.eyeY.x * 0.35 + sim.nod.x;
      set('face', 'transform', `matrix(${j11.toFixed(4)},${j21.toFixed(4)},${j12.toFixed(4)},${j22.toFixed(4)},${eeH.toFixed(2)},${ffH.toFixed(2)})`);
      set('faceTilt', 'transform', `rotate(${((sim.tilt.x + sim.lookTilt.x) * 57.3).toFixed(2)} ${A.x} ${A.y})`);

      // ---- eyes -----------------------------------------------------------
      const lid = clamp(sim.lid.x * sim.blink, 0.03, 1.6);
      const wide = sim.wide.x;
      const arc = clamp(sim.arc.x, 0, 1);
      const ex = sim.eyeX.x;
      const ey = sim.eyeY.x;
      const eyeSX = (1 + wide * 0.1) * (1 - sim.squish.x * 0.06);
      const eyeSY = lid * (1 + wide * 0.12);
      const cov = sim.cover.x;
      const slant = sim.slant.x;
      const shine = clamp(sim.shine.x, 0, 1.2);
      for (const [key, base, ck, inner] of [
        ['eyeL', EYE_L, sim.cheekL.x, 1],
        ['eyeR', EYE_R, sim.cheekR.x, -1],
      ] as [string, Pt, number, number][]) {
        set(key, 'transform', `translate(${(base.x + ex + ck * 0.22).toFixed(2)} ${(base.y + ey).toFixed(2)})`);
        set(`${key}s`, 'transform', `scale(${eyeSX.toFixed(3)} ${Math.max(0.03, eyeSY).toFixed(3)})`);
        set(`${key}s`, 'opacity', (1 - arc).toFixed(3));
        set(`${key}a`, 'opacity', arc.toFixed(3));
        set(`${key}p`, 'transform', `translate(${(ex * 0.35).toFixed(2)} ${(ey * 0.35).toFixed(2)}) scale(${sim.pupil.x.toFixed(3)})`);
        set(`${key}i`, 'transform', `translate(0 6) scale(${(1 + shine * 0.2).toFixed(3)}) translate(0 -6)`);
        set(`${key}i`, 'opacity', clamp(0.8 + shine * 0.3, 0, 1).toFixed(3));
        // eyelid
        const lo = clamp(Math.abs(cov) * 10, 0, 1) * (1 - arc);
        set(`${key}l`, 'opacity', lo.toFixed(3));
        if (lo > 0.01) {
          const line = -29 + cov * 58;
          const yAt = (x: number) => line + slant * 9 * ((inner * x) / 32);
          const y1 = yAt(-34);
          const y2 = yAt(34);
          set(`${key}l`, 'transform', `scale(${eyeSX.toFixed(3)} ${Math.max(0.03, eyeSY).toFixed(3)})`);
          set(`${key}lf`, 'd', `M-34 -40L34 -40L34 ${y2.toFixed(2)}L-34 ${y1.toFixed(2)}Z`);
          set(`${key}ll`, 'd', `M-34 ${y1.toFixed(2)}L34 ${y2.toFixed(2)}`);
        }
      }

      // ---- mouth ----------------------------------------------------------
      const mw = Math.max(8, sim.mw.x);
      const cv = sim.curve.x;
      const op = clamp(sim.open.x, 0, 1.6);
      const sk = sim.smirk.x;
      set('mouth', 'transform', `translate(${(MOUTH.x + sk * 2.5).toFixed(2)} ${MOUTH.y})`);
      set(
        'smile',
        'd',
        `M${(-mw / 2).toFixed(1)} ${(-cv * 2 + sk * 3.4).toFixed(1)}Q0 ${(cv * 13).toFixed(1)} ${(mw / 2).toFixed(1)} ${(-cv * 2 - sk * 3.4).toFixed(1)}`,
      );
      set('smile', 'opacity', clamp(1 - op * 1.1, 0, 1).toFixed(2));
      set('mouthO', 'rx', (mw * 0.33 * (1 + op * 0.12)).toFixed(2));
      set('mouthO', 'ry', (op * 8.4).toFixed(2));
      set('mouthO', 'cy', (2 + op * 3.4).toFixed(2));
      set('mouthO', 'opacity', clamp(op * 1.6, 0, 1).toFixed(2));
      set('tongue', 'opacity', clamp((op - 0.55) * 1.5, 0, 0.85).toFixed(2));
      set('tongue', 'rx', (mw * 0.2).toFixed(2));
      set('tongue', 'ry', (op * 3.1).toFixed(2));
      set('tongue', 'cy', (4 + op * 6).toFixed(2));

      // ---- blush ------------------------------------------------------------
      const bl = clamp(sim.blush.x + sim.warm.x * 0.6, 0, 1.75);
      set('blushL', 'opacity', (bl * 0.5).toFixed(3));
      set('blushR', 'opacity', (bl * 0.5).toFixed(3));
      set('blushL', 'transform', `translate(${(CHEEK_L.x + sim.cheekL.x * 0.85).toFixed(2)} ${CHEEK_L.y}) scale(${(1 + Math.abs(sim.cheekL.x) / 120 + sim.warm.x * 0.15).toFixed(3)} 1)`);
      set('blushR', 'transform', `translate(${(CHEEK_R.x + sim.cheekR.x * 0.85).toFixed(2)} ${CHEEK_R.y}) scale(${(1 + Math.abs(sim.cheekR.x) / 120 + sim.warm.x * 0.15).toFixed(3)} 1)`);

      // ---- arms -------------------------------------------------------------
      const up = clamp(sim.armUp.x, 0, 1);
      const armPath = (base: Pt, tug: number, side: number) => {
        const rx = 25 * (1 + Math.abs(tug) / 110);
        const ry = 31 * (1 - Math.abs(tug) / 300);
        const ox = base.x + tug * 0.7 + side * up * -26;
        const oy = base.y - up * 70 + Math.sin(t * 1.4 + side) * 1.2;
        const rot = side * 0.22 + tug * 0.004 - side * up * 0.5;
        const cs = Math.cos(rot);
        const sn = Math.sin(rot);
        const pts: Pt[] = [];
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const lx = Math.cos(a) * rx;
          const ly = Math.sin(a) * ry;
          pts.push(D(ox + lx * cs - ly * sn, oy + lx * sn + ly * cs));
        }
        return closedSpline(pts);
      };
      set('armL', 'd', armPath(ARM_L, sim.armL.x, -1));
      set('armR', 'd', armPath(ARM_R, sim.armR.x, 1));

      // ---- highlights & inner glow -------------------------------------------
      const hl = D(CX - 52, BCY - 46);
      set('spec', 'transform', `translate(${hl.x.toFixed(2)} ${hl.y.toFixed(2)}) rotate(-24) scale(${sim.sx.x.toFixed(3)} ${sim.sy.x.toFixed(3)})`);
      const ig = D(CX, BCY + 62);
      set('inner', 'transform', `translate(${ig.x.toFixed(2)} ${ig.y.toFixed(2)}) scale(${(sim.sx.x * (1 + sim.melt.x * 0.2)).toFixed(3)} ${sim.sy.x.toFixed(3)})`);
      const rim = D(CX, BCY);
      set('rim', 'transform', `translate(${(rim.x - CX).toFixed(2)} ${(rim.y - BCY).toFixed(2)})`);

      // ---- wick + flame --------------------------------------------------------
      const wb = D(CX, TOPY + 14);
      const wt = D(CX, TOPY - 16);
      set('wick', 'd', `M${wb.x.toFixed(2)} ${wb.y.toFixed(2)}Q${((wb.x + wt.x) / 2 + sim.flameLean.x * 3).toFixed(2)} ${((wb.y + wt.y) / 2).toFixed(2)} ${wt.x.toFixed(2)} ${wt.y.toFixed(2)}`);

      const fa = clamp(sim.fireAmt.x, 0, 1.15);
      const jit = sim.jit;
      const tj = t * (1 + jit * 2.4);
      const flick =
        1 +
        Math.sin(t * 12.7) * 0.045 +
        Math.sin(t * 21.3 + 1.3) * 0.028 +
        Math.sin(t * 5.1) * 0.03 +
        jit * (Math.sin(t * 47) * 0.16 + Math.sin(t * 31 + 1) * 0.1);
      const fh = clamp(74 * sim.flame.x * fa * flick, 0, 230);
      const fw = 14.5 * (0.55 + 0.45 * Math.min(1, fa)) * (1 + (1 - clamp(sim.flame.x, 0, 1.6) * 0.3) * 0.05);
      const bend = clamp(sim.flameLean.x * 0.5, -0.45, 0.45);
      const leanDeg = clamp(sim.flameLean.x * 44 + sim.rot.x * 22 + Math.sin(t * 37) * jit * 5, -52, 52);
      const flameOn = fa > 0.03 && fh > 1.5;
      set('flameG', 'transform', `translate(${wt.x.toFixed(2)} ${wt.y.toFixed(2)}) rotate(${leanDeg.toFixed(2)})`);
      set('flameG', 'opacity', flameOn ? '1' : '0');
      if (flameOn) {
        const fh2 = Math.max(4, fh);
        set('flameOuter', 'd', flamePath(fh2, fw, bend, tj));
        set('flameMid', 'd', flamePath(fh2 * 0.68, fw * 0.62, bend * 0.9, tj * 1.25 + 2));
        set('flameCore', 'd', flamePath(fh2 * 0.34, fw * 0.34, bend * 0.7, tj * 1.6 + 4));
      }
      set('flameOuter', 'opacity', (0.62 * Math.min(1, fa * 1.4)).toFixed(3));
      set('flameMid', 'opacity', (0.85 * Math.min(1, fa * 1.5)).toFixed(3));
      set('flameCore', 'opacity', (0.95 * Math.min(1, fa * 1.6)).toFixed(3));

      // tiny spark at the wick (last gasp / relight) and the glowing wick after blow-out
      const sparkA = sim.sparkT > 0 ? clamp(sim.sparkT / 0.4, 0, 1) * (0.7 + 0.3 * Math.sin(t * 60)) : 0;
      const emberA = sim.emberT > 0 ? clamp(sim.emberT / 1.6, 0, 1) * (0.55 + 0.45 * Math.sin(t * 9)) * 0.7 : 0;
      set('wickSpark', 'transform', `translate(${wt.x.toFixed(2)} ${(wt.y - 1).toFixed(2)}) scale(${(0.55 + sparkA * 0.7).toFixed(2)})`);
      set('wickSpark', 'opacity', clamp(Math.max(sparkA, emberA), 0, 1).toFixed(3));

      // glow around the flame + warm pool of light on the table
      const gv = clamp(sim.glow.x, 0.05, 2);
      set('halo', 'transform', `translate(${wt.x.toFixed(2)} ${(wt.y - fh * 0.38).toFixed(2)}) scale(${(0.72 + gv * 0.4).toFixed(3)})`);
      set('halo', 'opacity', (0.42 * clamp(gv, 0, 1.4)).toFixed(3));
      set('pool', 'opacity', (0.3 * clamp(gv, 0, 1.4)).toFixed(3));
      set('pool', 'transform', `translate(${sim.slide.x.toFixed(2)} 0) scale(${(0.95 + gv * 0.12).toFixed(3)} 1)`);
      set('shadow', 'transform', `translate(${(sim.slide.x + sim.lean.x * 0.12).toFixed(2)} 0) scale(${(sim.sx.x * (1 + sim.melt.x * 0.2) * spread * 0.98).toFixed(3)} ${(1 - sim.melt.x * 0.1).toFixed(3)})`);
      set('shadow', 'opacity', (0.42 * clamp(0.6 + gv * 0.4, 0, 1.4)).toFixed(3));
      onLight?.(gv, wt.x, wt.y);

      // ---- sleepy z's ----------------------------------------------------------
      const sleep = clamp((sim.sleepiness - 0.55) / 0.35, 0, 1);
      const zb = D(CX + 62, TOPY + 26);
      for (let i = 0; i < 2; i++) {
        const ph = ((t * 0.32 + i * 0.5) % 1 + 1) % 1;
        const o = sleep * Math.sin(ph * Math.PI) * 0.85;
        set(`zz${i}`, 'opacity', o.toFixed(3));
        set(
          `zz${i}`,
          'transform',
          `translate(${(zb.x + 16 + ph * 26 + Math.sin(ph * 7 + i) * 5).toFixed(2)} ${(zb.y - 6 - ph * 64).toFixed(2)}) rotate(${(10 + ph * 16).toFixed(1)}) scale(${(0.6 + ph * 0.7).toFixed(3)})`,
        );
      }

      // ---- sparks ------------------------------------------------------------
      if (sim.sparks > 0) {
        const n = Math.min(sim.sparks, 6);
        sim.sparks -= n;
        for (let i = 0; i < n && sparks.length < 26; i++) {
          sparks.push({
            x: wt.x + (Math.random() - 0.5) * 10,
            y: wt.y - fh * (0.3 + Math.random() * 0.5),
            vx: (Math.random() - 0.5) * 26,
            vy: -22 - Math.random() * 40,
            life: 0,
            max: 0.7 + Math.random() * 0.8,
            r: 0.9 + Math.random() * 1.6,
          });
        }
      }
      for (let i = 0; i < 26; i++) {
        const el = R.current[`spark${i}`];
        if (!el) continue;
        const s = sparks[i];
        if (!s) {
          el.setAttribute('opacity', '0');
          continue;
        }
        s.life += dt;
        if (s.life > s.max) {
          sparks.splice(i, 1);
          el.setAttribute('opacity', '0');
          continue;
        }
        s.vy -= 8 * dt;
        s.vx += Math.sin(t * 7 + i) * 14 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const k = 1 - s.life / s.max;
        el.setAttribute('cx', s.x.toFixed(2));
        el.setAttribute('cy', s.y.toFixed(2));
        el.setAttribute('r', (s.r * k).toFixed(2));
        el.setAttribute('opacity', (k * 0.85).toFixed(3));
      }

      // ---- hit regions (follow the deformed creature) -------------------------
      const h = hitRef.current;
      const fc = D(FACE_A.x, FACE_A.y);
      h.face.x = fc.x;
      h.face.y = fc.y;
      h.flame.x = wt.x + Math.sin(leanDeg / 57.3) * fh * 0.45;
      h.flame.y = wt.y - Math.cos(leanDeg / 57.3) * fh * 0.45;
      h.wick.x = wt.x;
      h.wick.y = wt.y - 8;
      const cL = D(CHEEK_L.x + sim.cheekL.x, CHEEK_L.y);
      const cR = D(CHEEK_R.x + sim.cheekR.x, CHEEK_R.y);
      h.cheekL.x = cL.x;
      h.cheekL.y = cL.y;
      h.cheekR.x = cR.x;
      h.cheekR.y = cR.y;
      const aL = D(ARM_L.x + sim.armL.x * 0.7 + up * 26, ARM_L.y - up * 70);
      const aR = D(ARM_R.x + sim.armR.x * 0.7 - up * 26, ARM_R.y - up * 70);
      h.armL.x = aL.x;
      h.armL.y = aL.y;
      h.armR.x = aR.x;
      h.armR.y = aR.y;
      const bc = D(CX, 398);
      h.belly.x = bc.x;
      h.belly.y = bc.y;
      const ctr = D(CX, BCY);
      h.center.x = ctr.x;
      h.center.y = ctr.y;
      h.rx = 135 * sim.sx.x;
      h.ry = 132 * sim.sy.x;

      // ---- the room: props, heat, fire, steam — and what the candle makes of it ----
      world.geo.base.x = wt.x;
      world.geo.base.y = wt.y;
      world.geo.tip.x = wt.x + Math.sin(leanDeg / 57.3) * fh * 0.95;
      world.geo.tip.y = wt.y - Math.cos(leanDeg / 57.3) * fh * 0.95;
      world.geo.lit = sim.lit;
      world.geo.amt = clamp(sim.fireAmt.x * (0.4 + 0.6 * clamp(sim.flame.x, 0, 1)), 0, 1);
      world.update(dt);
      world.paint(R.current);
      set('dimmer', 'opacity', (0.42 * (1 - clamp(sim.glow.x, 0, 1))).toFixed(3));
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refreshRect);
      window.removeEventListener('scroll', refreshRect, true);
      svg.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('pointerleave', onLeave);
      window.clearTimeout(G.timer);
    };
  }, [onFirstInteract, onLight]);

  const r = (k: string) => (el: SVGElement | null) => {
    R.current[k] = el;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${VBX} 0 ${VBW} ${VBH}`}
      className="h-full w-full touch-none select-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="waxBody" cx="42%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="38%" stopColor="#fff4cf" />
          <stop offset="72%" stopColor="#ffe49a" />
          <stop offset="100%" stopColor="#f0bd5c" />
        </radialGradient>
        <radialGradient id="waxCap" cx="45%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#fffef8" />
          <stop offset="45%" stopColor="#fff6d6" />
          <stop offset="100%" stopColor="#f6d888" />
        </radialGradient>
        <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffdf4" />
          <stop offset="55%" stopColor="#fff2c8" />
          <stop offset="100%" stopColor="#f5cf84" />
        </linearGradient>
        <linearGradient id="dripGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff8dd" />
          <stop offset="70%" stopColor="#ffeab0" />
          <stop offset="100%" stopColor="#ffd98a" />
        </linearGradient>
        <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ffc864" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffbe50" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="specGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#6b4a16" />
          <stop offset="45%" stopColor="#3a2408" />
          <stop offset="100%" stopColor="#190f02" />
        </radialGradient>
        <radialGradient id="irisGrad" cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#ffbe45" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8a5a12" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a72" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff8a72" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.75" />
          <stop offset="35%" stopColor="#ffb449" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff9a1e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="poolGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffc46a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff9c2e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0d02" stopOpacity="0.8" />
          <stop offset="65%" stopColor="#1a0d02" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1a0d02" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flameOut" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff8c1a" stopOpacity="0.15" />
          <stop offset="35%" stopColor="#ffb13a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffd96a" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="flameMidG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffd25a" />
          <stop offset="60%" stopColor="#ffe9a0" />
          <stop offset="100%" stopColor="#fff6d2" />
        </linearGradient>
        <linearGradient id="flameCoreG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#fffdf0" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <clipPath id="eyeClip">
          <ellipse cx={0} cy={0} rx={26.5} ry={29.5} />
        </clipPath>
      </defs>

      {/* invisible catcher so pointer events work everywhere in the frame */}
      <rect x={VBX} y="0" width={VBW} height={VBH} fill="#000" opacity="0" pointerEvents="all" />

      {/* warm pool of light on the table */}
      <ellipse ref={r('pool')} cx={CX} cy={GROUND + 6} rx={250} ry={62} fill="url(#poolGrad)" opacity="0.3" />
      {/* contact shadow */}
      <ellipse ref={r('shadow')} cx={CX} cy={GROUND + 4} rx={168} ry={26} fill="url(#shadowGrad)" opacity="0.42" />
      {/* flame halo */}
      <ellipse ref={r('halo')} cx={0} cy={0} rx={190} ry={200} fill="url(#haloGrad)" opacity="0.4" />

      {/* the little workspace: pen, ink, matches, saucer… */}
      <WorldBack />

      {/* melted puddle foot */}
      <path ref={r('puddle')} d="" fill="#f7d890" opacity="0.92" />
      <path ref={r('puddle2')} d="" fill="#fff0bd" opacity="0.75" />

      {/* body */}
      <path ref={r('body')} d="" fill="url(#waxBody)" />
      <g ref={r('inner')}>
        <ellipse cx={0} cy={0} rx={92} ry={66} fill="url(#innerGlow)" />
      </g>
      <path ref={r('bodyEdge')} d="" fill="none" stroke="#ffe9ad" strokeOpacity="0.55" strokeWidth="2.5" />
      <g ref={r('spec')}>
        <ellipse cx={0} cy={0} rx={34} ry={20} fill="url(#specGrad)" />
      </g>

      {/* wax cap + drips */}
      <path
        ref={r('cap')}
        d=""
        fill="url(#capGrad)"
        opacity="0.97"
        stroke="#fff8dc"
        strokeOpacity="0.45"
        strokeWidth="1.6"
      />
      {DRIPS.map((_, i) => (
        <path key={i} ref={r(`drip${i}`)} d="" fill="url(#dripGrad)" />
      ))}

      {/* face */}
      <g ref={r('face')}>
        <g ref={r('faceTilt')}>
          <ellipse ref={r('blushL')} cx={0} cy={0} rx={27} ry={14} fill="url(#blushGrad)" opacity="0.3" />
          <ellipse ref={r('blushR')} cx={0} cy={0} rx={27} ry={14} fill="url(#blushGrad)" opacity="0.3" />
          {(['eyeL', 'eyeR'] as const).map((k) => (
            <g key={k} ref={r(k)}>
              <g ref={r(`${k}s`)}>
                <ellipse cx={0} cy={0} rx={26} ry={29} fill="url(#eyeGrad)" />
                <g ref={r(`${k}p`)}>
                  <ellipse ref={r(`${k}i`)} cx={0} cy={6} rx={15} ry={14} fill="url(#irisGrad)" />
                  <ellipse cx={-9} cy={-11} rx={8.4} ry={9.4} fill="#ffffff" opacity="0.95" />
                  <circle cx={8} cy={10} r={4.2} fill="#fff3c9" opacity="0.8" />
                  <circle cx={11} cy={-9} r={2.3} fill="#ffffff" opacity="0.65" />
                </g>
              </g>
              <path
                ref={r(`${k}a`)}
                d="M-18 5 Q0 -15 18 5"
                fill="none"
                stroke="#2b1a06"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0"
              />
              {/* upper lid: narrows the eye (mischievous / offended) or lifts at the inner corner (worried) */}
              <g ref={r(`${k}l`)} clipPath="url(#eyeClip)" opacity="0">
                <path ref={r(`${k}lf`)} d="" fill="#fff1c6" />
                <path ref={r(`${k}ll`)} d="" fill="none" stroke="#2b1a06" strokeWidth="3.6" strokeLinecap="round" />
              </g>
            </g>
          ))}
          <g ref={r('mouth')}>
            <ellipse ref={r('mouthO')} cx={0} cy={3} rx={7} ry={0} fill="#4a2a0c" opacity="0" />
            <ellipse ref={r('tongue')} cx={0} cy={6} rx={4} ry={0} fill="#ff8f86" opacity="0" />
            <path ref={r('smile')} d="M-10 0Q0 7 10 0" fill="none" stroke="#3c2409" strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </g>
      </g>

      {/* little arms (drawn last so they can cover the face) */}
      <path ref={r('armL')} d="" fill="url(#waxBody)" stroke="#ffeec0" strokeOpacity="0.5" strokeWidth="1.6" />
      <path ref={r('armR')} d="" fill="url(#waxBody)" stroke="#ffeec0" strokeOpacity="0.5" strokeWidth="1.6" />

      {/* things on the table: papers, tea, soup */}
      <WorldItems r={r} />

      {/* the room dims when the flame goes out */}
      <rect ref={r('dimmer')} x={VBX} y={0} width={VBW} height={VBH} fill="#0a0502" opacity="0" style={{ pointerEvents: 'none' }} />

      {/* wick + flame */}
      <path ref={r('wick')} d="" fill="none" stroke="#6d4a1c" strokeWidth="4" strokeLinecap="round" />
      <g ref={r('flameG')}>
        <path ref={r('flameOuter')} d="" fill="url(#flameOut)" />
        <path ref={r('flameMid')} d="" fill="url(#flameMidG)" />
        <path ref={r('flameCore')} d="" fill="url(#flameCoreG)" />
      </g>
      {Array.from({ length: 26 }, (_, i) => (
        <circle key={i} ref={r(`spark${i}`)} cx={0} cy={0} r={1} fill="#ffd98a" opacity="0" />
      ))}

      {/* last-gasp spark / glowing wick ember */}
      <g ref={r('wickSpark')} opacity="0">
        <circle cx={0} cy={0} r={9} fill="url(#hotG)" />
        <circle cx={0} cy={0} r={2.2} fill="#fff6c8" />
      </g>

      {/* fire on paper, steam, smoke, ash */}
      <WorldFx r={r} />

      {/* sleepy z's */}
      {[0, 1].map((i) => (
        <text
          key={i}
          ref={r(`zz${i}`)}
          x={0}
          y={0}
          opacity="0"
          fill="#ffe3a8"
          fontSize="26"
          fontFamily="ui-rounded, system-ui, sans-serif"
          fontWeight="700"
          style={{ pointerEvents: 'none' }}
        >
          z
        </text>
      ))}
    </svg>
  );
}
