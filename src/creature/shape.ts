import { CX, BCY, RX, RY } from './sim';

export type Pt = { x: number; y: number };

// Catmull-Rom → cubic bezier, closed loop
export function closedSpline(p: Pt[]): string {
  const n = p.length;
  let d = `M${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(
      p2.x -
      (p3.x - p1.x) / 6
    ).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + 'Z';
}

// Catmull-Rom through an open list of points (ends clamped), optionally closed with Z
export function openSpline(p: Pt[], close = false): string {
  const n = p.length;
  const at = (i: number) => p[Math.max(0, Math.min(n - 1, i))];
  let d = `M${p[0].x.toFixed(2)} ${p[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ${(
      p2.x -
      (p3.x - p1.x) / 6
    ).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return close ? d + 'Z' : d;
}

// ---------------------------------------------------------------------------
// Base (undeformed) body silhouette: a rounded blob that widens into a
// melted skirt at the bottom, with a little static wax lumpiness.
// ---------------------------------------------------------------------------
export function baseRadius(a: number): Pt {
  let x = CX + RX * Math.cos(a);
  let y = BCY + RY * Math.sin(a);
  const b = Math.max(0, Math.sin(a)); // 0 top → 1 bottom
  const t = Math.max(0, -Math.sin(a)); // 1 top
  x = CX + (x - CX) * (1 + 0.3 * b * b) * (1 - 0.05 * t * t);
  y = BCY + (y - BCY) * (1 + 0.2 * b * b);
  // soft wax lumpiness (static, tiny)
  const l = 1 + 0.012 * Math.sin(a * 3 + 1.1) + 0.008 * Math.sin(a * 5 - 0.6);
  return { x: CX + (x - CX) * l, y: BCY + (y - BCY) * l };
}

// x of the silhouette at a given y (side: -1 left, +1 right)
export function outlineXAt(y: number, side: number): number {
  const t = Math.max(-1, Math.min(1, (y - BCY) / (RY * (y > BCY ? 1.2 : 1))));
  const c = Math.sqrt(Math.max(0, 1 - t * t));
  const b = Math.max(0, t);
  return CX + side * RX * c * (1 + 0.3 * b * b);
}

export const BODY_N = 54;
export const BODY_BASE: Pt[] = Array.from({ length: BODY_N }, (_, i) =>
  baseRadius((i / BODY_N) * Math.PI * 2 - Math.PI / 2),
);

// ---- wax cap (the frosting of melted wax over the head) -------------------
export const CAP_N = 22;
export function capDepth(u: number): number {
  return (
    34 +
    16 * Math.sin(u * 12.7 + 0.6) +
    10 * Math.sin(u * 7.1 + 2.3) +
    7 * Math.sin(u * 21.3 + 1.1) +
    12 * Math.pow(Math.abs(u - 0.5) * 2, 2.2)
  );
}

// ---- hanging drips --------------------------------------------------------
export type DripDef = { u: number; len: number; w: number; phase: number };
export const DRIPS: DripDef[] = [
  { u: 0.03, len: 58, w: 9.5, phase: 0.3 },
  { u: 0.1, len: 40, w: 7.5, phase: 1.9 },
  { u: 0.19, len: 26, w: 6.5, phase: 3.4 },
  { u: 0.32, len: 17, w: 6, phase: 0.9 },
  { u: 0.46, len: 22, w: 6.5, phase: 2.6 },
  { u: 0.6, len: 15, w: 5.5, phase: 4.1 },
  { u: 0.72, len: 28, w: 7, phase: 1.2 },
  { u: 0.84, len: 44, w: 8.5, phase: 2.2 },
  { u: 0.95, len: 62, w: 10, phase: 0.1 },
];

// ---- puddle ---------------------------------------------------------------
export const PUDDLE_N = 26;
export const PUDDLE_BASE: Pt[] = Array.from({ length: PUDDLE_N }, (_, i) => {
  const a = (i / PUDDLE_N) * Math.PI * 2;
  const r = 1 + 0.055 * Math.sin(a * 4 + 0.7) + 0.035 * Math.sin(a * 7 + 2.1);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
});

// ---- flame ----------------------------------------------------------------
export function flamePath(h: number, w: number, bend: number, t: number): string {
  const bx = (u: number) => bend * h * Math.pow(u, 1.7);
  const wob = Math.sin(t * 9.1) * 0.5 + Math.sin(t * 15.3 + 1.4) * 0.3;
  const wl = w * (1 + wob * 0.08);
  const wr = w * (1 - wob * 0.08);
  const tipx = bx(1) + Math.sin(t * 6.3) * h * 0.012;
  return (
    `M0 0` +
    `C${-wl * 1.0} ${-h * 0.16} ${-wl * 1.08 + bx(0.5) * 0.4} ${-h * 0.52} ${bx(0.8) - wl * 0.3} ${-h * 0.8}` +
    `C${bx(0.92) - wl * 0.12} ${-h * 0.93} ${tipx - 1} ${-h * 0.95} ${tipx} ${-h}` +
    `C${tipx + 1} ${-h * 0.95} ${bx(0.92) + wr * 0.12} ${-h * 0.93} ${bx(0.8) + wr * 0.3} ${-h * 0.8}` +
    `C${wr * 1.08 + bx(0.5) * 0.4} ${-h * 0.52} ${wr * 1.0} ${-h * 0.16} 0 0Z`
  );
}
