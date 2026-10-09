import type { JSX } from 'preact';
import { areaPath, createScales, formatTick, linePath, niceTicks, yCap, type Point } from '../../lib/plot/geometry';

export interface SvgPlotProps {
  /** line: 連続関数の曲線 / stem: 離散分布の棒 */
  kind: 'line' | 'stem';
  points: readonly Point[];
  xMin: number;
  xMax: number;
  /** 塗りつぶす区間（両端を含む）。両側確率のように複数指定できる */
  shade?: { from: number; to: number } | readonly { from: number; to: number }[] | null;
  /** 縦線のマーカー（分位点など） */
  markers?: readonly { x: number; label: string }[];
  ariaLabel: string;
  height?: number;
  /** y 軸の上限を固定したいとき（CDF は 1） */
  yMax?: number;
}

const W = 640;

export default function SvgPlot({ kind, points, xMin, xMax, shade, markers = [], ariaLabel, height = 260, yMax }: SvgPlotProps): JSX.Element {
  const top = yMax ?? yCap(points);
  const sc = createScales({ xMin, xMax, yMin: 0, yMax: top, width: W, height, pad: { l: 48, r: 14, t: 12, b: 30 } });
  const xTicks = kind === 'stem' ? niceTicks(xMin, xMax, 8).filter((t) => Number.isInteger(t)) : niceTicks(xMin, xMax, 8);
  const yTicks = niceTicks(0, top, 4);
  const intervals = shade ? (Array.isArray(shade) ? shade : [shade as { from: number; to: number }]) : [];
  const within = (x: number, r: { from: number; to: number }) => x >= r.from - 1e-12 && x <= r.to + 1e-12;
  const inShade = (x: number) => intervals.some((r) => within(x, r));
  const shadePaths = kind === 'line' ? intervals.map((r) => points.filter((p) => within(p.x, r))).filter((pts) => pts.length > 1) : [];
  const barW = kind === 'stem' ? Math.max(2, Math.min(18, ((W - 62) / Math.max(1, xMax - xMin + 1)) * 0.6)) : 0;

  return (
    <svg class="plot" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
      <g class="plot-grid">
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={sc.pad.l} x2={W - sc.pad.r} y1={sc.y(t)} y2={sc.y(t)} />
            <text x={sc.pad.l - 6} y={sc.y(t) + 4} text-anchor="end">{formatTick(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sc.x(t)} y={height - 10} text-anchor="middle">{formatTick(t)}</text>
        ))}
        <line class="plot-axis" x1={sc.pad.l} x2={W - sc.pad.r} y1={sc.y(0)} y2={sc.y(0)} />
      </g>
      {kind === 'line' ? (
        <g>
          {shadePaths.map((pts, i) => <path key={i} class="plot-shade" d={areaPath(pts, sc)} />)}
          <path class="plot-line" d={linePath(points, sc)} />
        </g>
      ) : (
        <g>
          {points.map((p) => (
            <rect
              key={p.x}
              class={inShade(p.x) ? 'plot-bar plot-bar-shade' : 'plot-bar'}
              x={sc.x(p.x) - barW / 2}
              y={sc.y(p.y)}
              width={barW}
              height={Math.max(0, sc.y(0) - sc.y(p.y))}
            />
          ))}
        </g>
      )}
      {markers.map((m) => (
        <g key={`m${m.x}`} class="plot-marker">
          <line x1={sc.x(m.x)} x2={sc.x(m.x)} y1={sc.pad.t} y2={sc.y(0)} />
          <text x={sc.x(m.x) + 4} y={sc.pad.t + 12}>{m.label}</text>
        </g>
      ))}
    </svg>
  );
}
