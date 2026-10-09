import { getDistribution, validateParams, type Params } from '../distributions/registry';
import { err, ok, type Result } from '../result';

/** 計算機で扱う分布（要件12.1） */
export const CALCULATOR_DISTRIBUTIONS = ['normal', 't', 'chisq', 'f'] as const;
export type CalculatorDistribution = (typeof CALCULATOR_DISTRIBUTIONS)[number];

export interface InputError {
  field: string;
  message: string;
}

export interface Probabilities {
  /** P(X ≤ x) */
  lower: number;
  /** P(X ≥ x) */
  upper: number;
  /** 対称な分布のみ: P(|X − μ| ≥ |x − μ|) */
  twoSided: number | null;
}

function checkParams(id: CalculatorDistribution, params: Params): InputError | null {
  const def = getDistribution(id);
  if (!def) return { field: 'dist', message: '分布が見つかりません' };
  const v = validateParams(def, params);
  return v.ok ? null : (v.errors[0] ? { field: v.errors[0].param, message: v.errors[0].message } : null);
}

/** 上側確率（裾の精度を保つため、対称な分布は反対側の下側確率を使う） */
function upperTail(id: CalculatorDistribution, params: Params, x: number): number {
  const def = getDistribution(id)!;
  if (id === 'normal') return def.cdf(2 * (params.mu ?? 0) - x, params);
  if (id === 't') return def.cdf(-x, params);
  return 1 - def.cdf(x, params);
}

export function computeProbabilities(id: CalculatorDistribution, params: Params, x: number): Result<Probabilities, InputError> {
  const pe = checkParams(id, params);
  if (pe) return err(pe);
  if (!Number.isFinite(x)) return err({ field: 'x', message: '値に数値を入力してください' });
  if ((id === 'chisq' || id === 'f') && x < 0) return err({ field: 'x', message: '値は 0 以上で入力してください（有効範囲: x ≥ 0）' });
  const def = getDistribution(id)!;
  const lower = def.cdf(x, params);
  const upper = upperTail(id, params, x);
  let twoSided: number | null = null;
  if (id === 'normal' || id === 't') {
    const center = id === 'normal' ? (params.mu ?? 0) : 0;
    const d = Math.abs(x - center);
    twoSided = Math.min(1, 2 * upperTail(id, params, center + d));
  }
  return ok({ lower, upper, twoSided });
}

/** 分位点。tail='lower' は P(X ≤ x) = p、'upper' は P(X ≥ x) = p となる x */
export function computeQuantile(id: CalculatorDistribution, params: Params, p: number, tail: 'lower' | 'upper'): Result<number, InputError> {
  const pe = checkParams(id, params);
  if (pe) return err(pe);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return err({ field: 'p', message: '確率は 0 より大きく 1 より小さい値で入力してください（有効範囲: 0 < p < 1）' });
  const def = getDistribution(id)!;
  if (tail === 'lower') return ok(def.quantile(p, params));
  // 上側確率が小さいときの精度のため、対称な分布は下側の分位点から求める
  if (id === 'normal') return ok(2 * (params.mu ?? 0) - def.quantile(p, params));
  if (id === 't') return ok(-def.quantile(p, params));
  return ok(def.quantile(1 - p, params));
}

/** 確率の表示: 小数点以下6桁、1e-4 未満は指数表記（要件12.5） */
export function formatProbability(p: number): string {
  if (p === 0) return '0';
  if (Math.abs(p) < 1e-4) return p.toExponential(4);
  return p.toFixed(6);
}

/** 値（分位点）の表示: 小数点以下6桁、絶対値が 1e4 以上なら4桁 */
export function formatValue(x: number): string {
  return Math.abs(x) >= 1e4 ? x.toFixed(4) : x.toFixed(6);
}
