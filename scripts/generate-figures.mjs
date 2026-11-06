// 問題で使う図（public/figures/）を計算して生成する。使い方: node scripts/generate-figures.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

/** X'X=I のときの罰則付き最小二乗 ||y-Xβ||²+λ1Σ|βj|+λ2Σβj² の解（OLS 推定値 b からの閉じた形） */
const penalized = (b, l1, l2) => b.map((x) => (Math.sign(x) * Math.max(Math.abs(x) - l1 / 2, 0)) / (1 + l2));

const OLS = [4, -3.2, 2.4, 1.6, -1.2, 0.9, -0.7, 0.4, -0.3, 0.25];
const PANELS = [
  ['最小二乗推定値', OLS],
  ['A', penalized(OLS, 0, 1)],
  ['B', penalized(OLS, 1, 0.5)],
  ['C', penalized(OLS, 2, 0)],
];

const W = 300;
const H = 260;
const LEFT = 42;
const TOP = 34;
const PLOT_W = W - LEFT - 12;
const PLOT_H = H - TOP - 46;
const Y_MIN = -4;
const Y_MAX = 4;
const yOf = (v) => TOP + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * PLOT_H;
const xOf = (j) => LEFT + ((j + 0.5) / OLS.length) * PLOT_W;
const r1 = (v) => Math.round(v * 10) / 10;

function panel([title, values], ox, oy) {
  const ticks = [-4, -2, 0, 2, 4].map((v) => {
    const y = r1(yOf(v));
    const line = `<line x1="${LEFT}" x2="${W - 12}" y1="${y}" y2="${y}" stroke="${v === 0 ? '#333' : '#ddd'}"/>`;
    return `${line}<text x="${LEFT - 6}" y="${y + 6}" text-anchor="end">${v}</text>`;
  });
  const stems = values.map((v, j) => {
    const x = r1(xOf(j));
    const y = r1(yOf(v));
    return `<line x1="${x}" x2="${x}" y1="${r1(yOf(0))}" y2="${y}" stroke="#2563eb" stroke-width="2"/><circle cx="${x}" cy="${y}" r="4" fill="#2563eb"/><text x="${x}" y="${H - 26}" text-anchor="middle">${j + 1}</text>`;
  });
  return `<g transform="translate(${ox},${oy})"><text x="${LEFT}" y="22" font-size="20" font-weight="bold">${title}</text>${ticks.join('')}${stems.join('')}<text x="${LEFT + PLOT_W / 2}" y="${H - 4}" text-anchor="middle">係数の番号 j</text></g>`;
}

const body = PANELS.map((p, i) => panel(p, (i % 2) * W + 10, Math.floor(i / 2) * H + 6)).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${2 * W + 20}" height="${2 * H + 12}" viewBox="0 0 ${2 * W + 20} ${2 * H + 12}" font-family="sans-serif" font-size="16" fill="#222"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>\n`;

mkdirSync('public/figures', { recursive: true });
writeFileSync('public/figures/regularization-coefficients.svg', svg);
