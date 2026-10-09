export interface Point {
  x: number;
  y: number;
}

export interface Scales {
  x(v: number): number;
  y(v: number): number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
  pad: { l: number; r: number; t: number; b: number };
}

const round = (v: number) => Math.round(v * 100) / 100;

export function createScales(o: Omit<Scales, 'x' | 'y'>): Scales {
  const iw = o.width - o.pad.l - o.pad.r;
  const ih = o.height - o.pad.t - o.pad.b;
  const xs = o.xMax - o.xMin || 1;
  const ys = o.yMax - o.yMin || 1;
  return {
    ...o,
    x: (v) => round(o.pad.l + ((v - o.xMin) / xs) * iw),
    y: (v) => {
      const c = Math.min(Math.max(v, o.yMin), o.yMax);
      return round(o.pad.t + ih - ((c - o.yMin) / ys) * ih);
    },
  };
}

/** きりのよい目盛（1, 2, 5 × 10^k 刻み） */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const err = raw / mag;
  const step = (err < 1.5 ? 1 : err < 3 ? 2 : err < 7 ? 5 : 10) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Number(v.toFixed(10)) || 0);
  return out;
}

export function sampleFunction(f: (x: number) => number, xMin: number, xMax: number, n = 400): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? xMin : xMin + ((xMax - xMin) * i) / (n - 1);
    pts.push({ x: Number(x.toPrecision(12)), y: f(x) });
  }
  return pts;
}

/**
 * y 軸の上限。発散点や極端に大きな値があるときは、97% 点の値を基準に切り詰めて
 * 分布の形が潰れないようにする。
 */
export function yCap(points: readonly Point[]): number {
  const ys = points.map((p) => p.y).filter((y) => Number.isFinite(y)).sort((a, b) => a - b);
  if (ys.length === 0) return 1;
  const max = ys[ys.length - 1] ?? 1;
  const p97 = ys[Math.floor((ys.length - 1) * 0.97)] ?? max;
  const hasInfinite = points.some((p) => !Number.isFinite(p.y) && !Number.isNaN(p.y));
  const spiky = ys.length >= 20 && p97 > 0 && (hasInfinite || max > p97 * 3);
  const base = spiky ? p97 * 1.3 : max;
  return base > 0 ? base * 1.1 : 1;
}

function finitePoints(points: readonly Point[], sc: Scales): Point[] {
  return points.map((p) => ({ x: p.x, y: Number.isNaN(p.y) ? 0 : Number.isFinite(p.y) ? p.y : sc.yMax }));
}

export function linePath(points: readonly Point[], sc: Scales): string {
  return finitePoints(points, sc)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${sc.x(p.x)},${sc.y(p.y)}`)
    .join('');
}

/** 曲線と基準線（y=yMin）で囲まれた領域 */
export function areaPath(points: readonly Point[], sc: Scales): string {
  const pts = finitePoints(points, sc);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return '';
  const body = pts.map((p) => `L${sc.x(p.x)},${sc.y(p.y)}`).join('');
  return `M${sc.x(first.x)},${sc.y(sc.yMin)}${body}L${sc.x(last.x)},${sc.y(sc.yMin)}Z`;
}

export function formatTick(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(0);
  return String(Number(v.toPrecision(4)));
}
