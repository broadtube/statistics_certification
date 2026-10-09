import * as S from '../../vendor/stdlib.js';

export type DistributionKind = 'discrete' | 'continuous';
export type Params = Record<string, number>;

export interface ParamSpec {
  name: string;
  /** 表示用の記号（プレーンテキスト） */
  label: string;
  /** 表示用の記号（LaTeX） */
  tex: string;
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
  integer: boolean;
  default: number;
  /** スライダーの範囲と刻み */
  uiMin: number;
  uiMax: number;
  step: number;
}

export interface DistributionDef {
  id: string;
  kind: DistributionKind;
  params: readonly ParamSpec[];
  support(params: Params): { min: number; max: number };
  /** 離散分布は確率関数、連続分布は確率密度関数 */
  density(x: number, params: Params): number;
  cdf(x: number, params: Params): number;
  quantile(p: number, params: Params): number;
  /** パラメータ間の制約（範囲検証の後に呼ばれる） */
  check?(params: Params): ParamError[];
  /** 描画範囲に用いる裾確率（既定 0.001） */
  tail?: number;
}

export interface ParamError {
  param: string;
  message: string;
}

export type ParamValidation = { ok: true } | { ok: false; errors: ParamError[] };

type Fn = (x: number, ...params: number[]) => number;

function param(
  name: string,
  label: string,
  tex: string,
  o: Partial<Omit<ParamSpec, 'name' | 'label' | 'tex'>> & Pick<ParamSpec, 'default' | 'uiMin' | 'uiMax'>,
): ParamSpec {
  return {
    name,
    label,
    tex,
    min: o.min ?? Number.NEGATIVE_INFINITY,
    max: o.max ?? Number.POSITIVE_INFINITY,
    minInclusive: o.minInclusive ?? false,
    maxInclusive: o.maxInclusive ?? false,
    integer: o.integer ?? false,
    default: o.default,
    uiMin: o.uiMin,
    uiMax: o.uiMax,
    step: o.step ?? (o.integer ? 1 : 0.1),
  };
}

const real = (name: string, label: string, tex: string, d: number, lo: number, hi: number, step = 0.1) =>
  param(name, label, tex, { default: d, uiMin: lo, uiMax: hi, step });
const positive = (name: string, label: string, tex: string, d: number, hi: number, step = 0.1) =>
  param(name, label, tex, { min: 0, default: d, uiMin: step, uiMax: hi, step });
const posInt = (name: string, label: string, tex: string, d: number, hi: number, min = 1) =>
  param(name, label, tex, { min, minInclusive: true, integer: true, default: d, uiMin: min, uiMax: hi });
const prob = (name: string, d: number, inclusive: { min: boolean; max: boolean }) =>
  param(name, 'p', 'p', { min: 0, max: 1, minInclusive: inclusive.min, maxInclusive: inclusive.max, default: d, uiMin: 0.01, uiMax: 0.99, step: 0.01 });

/** パラメータ名の順に stdlib 関数へ渡すラッパーを作る */
function wrap(names: readonly string[], density: Fn, cdf: Fn, quantile: Fn) {
  const args = (p: Params) => names.map((n) => p[n] ?? Number.NaN);
  return {
    density: (x: number, p: Params) => density(x, ...args(p)),
    cdf: (x: number, p: Params) => cdf(x, ...args(p)),
    quantile: (q: number, p: Params) => quantile(q, ...args(p)),
  };
}

const INF = Number.POSITIVE_INFINITY;
const ALL_REAL = () => ({ min: -INF, max: INF });
const NON_NEGATIVE = () => ({ min: 0, max: INF });

function define(def: DistributionDef): DistributionDef {
  return def;
}

export const DISTRIBUTIONS: Readonly<Record<string, DistributionDef>> = {
  bernoulli: define({
    id: 'bernoulli',
    kind: 'discrete',
    params: [prob('p', 0.3, { min: true, max: true })],
    support: () => ({ min: 0, max: 1 }),
    ...wrap(['p'], S.bernoulli_pmf, S.bernoulli_cdf, S.bernoulli_quantile),
  }),
  binomial: define({
    id: 'binomial',
    kind: 'discrete',
    params: [posInt('n', 'n', 'n', 10, 100, 0), prob('p', 0.3, { min: true, max: true })],
    support: (p) => ({ min: 0, max: p.n ?? 0 }),
    ...wrap(['n', 'p'], S.binomial_pmf, S.binomial_cdf, S.binomial_quantile),
  }),
  poisson: define({
    id: 'poisson',
    kind: 'discrete',
    params: [positive('lambda', 'λ', '\\lambda', 3, 30)],
    support: NON_NEGATIVE,
    ...wrap(['lambda'], S.poisson_pmf, S.poisson_cdf, S.poisson_quantile),
  }),
  geometric: define({
    id: 'geometric',
    kind: 'discrete',
    params: [prob('p', 0.3, { min: false, max: true })],
    support: NON_NEGATIVE,
    ...wrap(['p'], S.geometric_pmf, S.geometric_cdf, S.geometric_quantile),
  }),
  'negative-binomial': define({
    id: 'negative-binomial',
    kind: 'discrete',
    params: [posInt('r', 'r', 'r', 3, 30), prob('p', 0.4, { min: false, max: true })],
    support: NON_NEGATIVE,
    ...wrap(['r', 'p'], S.negativebinomial_pmf, S.negativebinomial_cdf, S.negativebinomial_quantile),
  }),
  hypergeometric: define({
    id: 'hypergeometric',
    kind: 'discrete',
    params: [posInt('N', 'N', 'N', 50, 200), posInt('K', 'K', 'K', 20, 200, 0), posInt('n', 'n', 'n', 10, 200, 0)],
    support: (p) => {
      const N = p.N ?? 0;
      const K = p.K ?? 0;
      const n = p.n ?? 0;
      return { min: Math.max(0, n + K - N), max: Math.min(n, K) };
    },
    check: (p) => {
      const e: ParamError[] = [];
      if ((p.K ?? 0) > (p.N ?? 0)) e.push({ param: 'K', message: 'K は N 以下にしてください（有効範囲: 0 ≤ K ≤ N）' });
      if ((p.n ?? 0) > (p.N ?? 0)) e.push({ param: 'n', message: 'n は N 以下にしてください（有効範囲: 0 ≤ n ≤ N）' });
      return e;
    },
    ...wrap(['N', 'K', 'n'], S.hypergeometric_pmf, S.hypergeometric_cdf, S.hypergeometric_quantile),
  }),
  uniform: define({
    id: 'uniform',
    kind: 'continuous',
    params: [real('a', 'a', 'a', 0, -10, 10), real('b', 'b', 'b', 1, -10, 10)],
    support: (p) => ({ min: p.a ?? 0, max: p.b ?? 1 }),
    check: (p) => ((p.a ?? 0) < (p.b ?? 0) ? [] : [{ param: 'b', message: 'b は a より大きくしてください（有効範囲: a < b）' }]),
    ...wrap(['a', 'b'], S.uniform_pdf, S.uniform_cdf, S.uniform_quantile),
  }),
  normal: define({
    id: 'normal',
    kind: 'continuous',
    params: [real('mu', 'μ', '\\mu', 0, -10, 10), positive('sigma', 'σ', '\\sigma', 1, 5)],
    support: ALL_REAL,
    ...wrap(['mu', 'sigma'], S.normal_pdf, S.normal_cdf, S.normal_quantile),
  }),
  exponential: define({
    id: 'exponential',
    kind: 'continuous',
    params: [positive('lambda', 'λ', '\\lambda', 1, 5)],
    support: NON_NEGATIVE,
    ...wrap(['lambda'], S.exponential_pdf, S.exponential_cdf, S.exponential_quantile),
  }),
  gamma: define({
    id: 'gamma',
    kind: 'continuous',
    params: [positive('alpha', 'α', '\\alpha', 2, 20), positive('lambda', 'λ', '\\lambda', 1, 5)],
    support: NON_NEGATIVE,
    ...wrap(['alpha', 'lambda'], S.gamma_pdf, S.gamma_cdf, S.gamma_quantile),
  }),
  beta: define({
    id: 'beta',
    kind: 'continuous',
    params: [positive('alpha', 'α', '\\alpha', 2, 20), positive('beta', 'β', '\\beta', 5, 20)],
    support: () => ({ min: 0, max: 1 }),
    ...wrap(['alpha', 'beta'], S.beta_pdf, S.beta_cdf, S.beta_quantile),
  }),
  chisq: define({
    id: 'chisq',
    kind: 'continuous',
    params: [positive('k', 'k', 'k', 5, 50, 1)],
    support: NON_NEGATIVE,
    ...wrap(['k'], S.chisquare_pdf, S.chisquare_cdf, S.chisquare_quantile),
  }),
  t: define({
    id: 't',
    kind: 'continuous',
    params: [positive('nu', 'ν', '\\nu', 10, 100, 1)],
    support: ALL_REAL,
    ...wrap(['nu'], S.t_pdf, S.t_cdf, S.t_quantile),
  }),
  f: define({
    id: 'f',
    kind: 'continuous',
    params: [positive('d1', 'd₁', 'd_1', 3, 100, 1), positive('d2', 'd₂', 'd_2', 10, 100, 1)],
    support: NON_NEGATIVE,
    ...wrap(['d1', 'd2'], S.f_pdf, S.f_cdf, S.f_quantile),
  }),
  lognormal: define({
    id: 'lognormal',
    kind: 'continuous',
    params: [real('mu', 'μ', '\\mu', 0, -3, 3), positive('sigma', 'σ', '\\sigma', 0.5, 2, 0.05)],
    support: NON_NEGATIVE,
    ...wrap(['mu', 'sigma'], S.lognormal_pdf, S.lognormal_cdf, S.lognormal_quantile),
  }),
  cauchy: define({
    id: 'cauchy',
    kind: 'continuous',
    params: [real('x0', 'x₀', 'x_0', 0, -10, 10), positive('gamma', 'γ', '\\gamma', 1, 5)],
    support: ALL_REAL,
    tail: 0.03,
    ...wrap(['x0', 'gamma'], S.cauchy_pdf, S.cauchy_cdf, S.cauchy_quantile),
  }),
  weibull: define({
    id: 'weibull',
    kind: 'continuous',
    params: [positive('k', 'k', 'k', 1.5, 10), positive('lambda', 'λ', '\\lambda', 1, 5)],
    support: NON_NEGATIVE,
    ...wrap(['k', 'lambda'], S.weibull_pdf, S.weibull_cdf, S.weibull_quantile),
  }),
};

export function getDistribution(id: string): DistributionDef | undefined {
  return DISTRIBUTIONS[id];
}

export function defaultParams(def: DistributionDef): Params {
  return Object.fromEntries(def.params.map((p) => [p.name, p.default]));
}

/** 有効範囲の説明文（例: "σ > 0"、"n は 0 以上の整数"、"0 ≤ p ≤ 1"） */
export function rangeText(p: ParamSpec): string {
  const lo = Number.isFinite(p.min);
  const hi = Number.isFinite(p.max);
  if (p.integer && lo && !hi) return `${p.label} は ${p.min} 以上の整数`;
  if (lo && hi) return `${p.min} ${p.minInclusive ? '≤' : '<'} ${p.label} ${p.maxInclusive ? '≤' : '<'} ${p.max}`;
  if (lo) return `${p.label} ${p.minInclusive ? '≥' : '>'} ${p.min}`;
  if (hi) return `${p.label} ${p.maxInclusive ? '≤' : '<'} ${p.max}`;
  return `${p.label} は実数`;
}

export function validateParams(def: DistributionDef, params: Params): ParamValidation {
  const errors: ParamError[] = [];
  for (const spec of def.params) {
    const v = params[spec.name];
    const range = rangeText(spec);
    if (v === undefined || !Number.isFinite(v)) {
      errors.push({ param: spec.name, message: `${spec.label} に数値を入力してください（有効範囲: ${range}）` });
      continue;
    }
    const below = spec.minInclusive ? v < spec.min : v <= spec.min;
    const above = spec.maxInclusive ? v > spec.max : v >= spec.max;
    if (below || above) errors.push({ param: spec.name, message: `${spec.label} の値が範囲外です（有効範囲: ${range}）` });
    else if (spec.integer && !Number.isInteger(v)) {
      errors.push({ param: spec.name, message: `${spec.label} は整数で指定してください（有効範囲: ${range}）` });
    }
  }
  if (errors.length === 0 && def.check) errors.push(...def.check(params));
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** グラフの描画範囲。台が有限ならその端を、無限なら裾の分位点を使う */
export function plotRange(def: DistributionDef, params: Params): { min: number; max: number } {
  const s = def.support(params);
  const tail = def.tail ?? 0.001;
  let lo = Number.isFinite(s.min) ? s.min : def.quantile(tail, params);
  let hi = Number.isFinite(s.max) ? s.max : def.quantile(1 - tail, params);
  if (def.kind === 'discrete') {
    lo = Math.floor(lo);
    hi = Math.max(Math.ceil(hi), lo + 1);
    return { min: lo, max: hi };
  }
  if (Number.isFinite(s.min) && Number.isFinite(s.max) && def.id === 'uniform') {
    const m = (hi - lo) * 0.15;
    lo -= m;
    hi += m;
  }
  if (!(hi > lo)) hi = lo + 1;
  return { min: lo, max: hi };
}
