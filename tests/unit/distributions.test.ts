import { describe, expect, it } from 'vitest';
import { DISTRIBUTIONS, defaultParams, getDistribution, plotRange, validateParams } from '../../src/lib/distributions/registry';
import { IMPLEMENTED_DISTRIBUTIONS } from '../../src/lib/distributions/ids';

const EXPECTED_IDS = [
  'bernoulli', 'binomial', 'poisson', 'geometric', 'negative-binomial', 'hypergeometric',
  'uniform', 'normal', 'exponential', 'gamma', 'beta', 'chisq', 't', 'f', 'lognormal', 'cauchy', 'weibull',
];

describe('分布レジストリ', () => {
  it('対話型の17分布を提供し、実装済みIDとして公開する', () => {
    expect(Object.keys(DISTRIBUTIONS).sort()).toEqual([...EXPECTED_IDS].sort());
    expect([...IMPLEMENTED_DISTRIBUTIONS].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it('既定パラメータは常に検証を通る', () => {
    for (const id of EXPECTED_IDS) {
      const def = getDistribution(id)!;
      expect(validateParams(def, defaultParams(def))).toEqual({ ok: true });
    }
  });

  it.each(EXPECTED_IDS.filter((id) => DISTRIBUTIONS[id]?.kind === 'continuous'))('%s: cdf(quantile(p)) ≈ p', (id) => {
    const def = getDistribution(id)!;
    const params = defaultParams(def);
    for (const p of [0.01, 0.1, 0.5, 0.9, 0.99]) {
      expect(def.cdf(def.quantile(p, params), params)).toBeCloseTo(p, 8);
    }
  });

  it.each(EXPECTED_IDS.filter((id) => DISTRIBUTIONS[id]?.kind === 'discrete'))('%s: 分位点は cdf(k) ≥ p となる最小の k', (id) => {
    const def = getDistribution(id)!;
    const params = defaultParams(def);
    for (const p of [0.05, 0.3, 0.5, 0.8, 0.95]) {
      const k = def.quantile(p, params);
      expect(def.cdf(k, params)).toBeGreaterThanOrEqual(p - 1e-12);
      if (k > def.support(params).min) expect(def.cdf(k - 1, params)).toBeLessThan(p);
    }
  });

  it('離散分布の確率関数の総和は1', () => {
    for (const id of EXPECTED_IDS.filter((x) => DISTRIBUTIONS[x]?.kind === 'discrete')) {
      const def = getDistribution(id)!;
      const params = defaultParams(def);
      const { min } = def.support(params);
      let s = 0;
      for (let k = min; k <= min + 2000; k++) s += def.density(k, params);
      expect(s).toBeCloseTo(1, 8);
    }
  });

  it('代表的な数表値と一致する', () => {
    const n = getDistribution('normal')!;
    expect(n.quantile(0.975, { mu: 0, sigma: 1 })).toBeCloseTo(1.959964, 6);
    expect(getDistribution('t')!.quantile(0.975, { nu: 10 })).toBeCloseTo(2.228139, 6);
    expect(getDistribution('chisq')!.quantile(0.95, { k: 5 })).toBeCloseTo(11.0705, 4);
    expect(getDistribution('f')!.quantile(0.95, { d1: 3, d2: 10 })).toBeCloseTo(3.708265, 5);
    expect(getDistribution('binomial')!.density(2, { n: 5, p: 0.5 })).toBeCloseTo(0.3125, 12);
    expect(getDistribution('poisson')!.cdf(1, { lambda: 2 })).toBeCloseTo(3 * Math.exp(-2), 12);
    expect(getDistribution('exponential')!.cdf(1, { lambda: 2 })).toBeCloseTo(1 - Math.exp(-2), 12);
    // ガンマ分布は形状 α・比率 λ（平均 α/λ）
    expect(getDistribution('gamma')!.cdf(2, { alpha: 1, lambda: 0.5 })).toBeCloseTo(1 - Math.exp(-1), 12);
    // 幾何分布は「初めて成功するまでの失敗回数」（0始まり）
    expect(getDistribution('geometric')!.density(0, { p: 0.3 })).toBeCloseTo(0.3, 12);
  });
});

describe('パラメータ検証', () => {
  it('範囲外の値は誤りごとに有効範囲を返す', () => {
    const def = getDistribution('normal')!;
    const r = validateParams(def, { mu: 0, sigma: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toMatchObject({ param: 'sigma' });
      expect(r.errors[0]?.message).toContain('σ > 0');
    }
  });

  it('境界の含否を区別する', () => {
    const b = getDistribution('bernoulli')!;
    expect(validateParams(b, { p: 0 }).ok).toBe(true);
    expect(validateParams(b, { p: 1 }).ok).toBe(true);
    expect(validateParams(b, { p: 1.01 }).ok).toBe(false);
    const bin = getDistribution('binomial')!;
    expect(validateParams(bin, { n: 10, p: 0 }).ok).toBe(true);
    const geo = getDistribution('geometric')!;
    expect(validateParams(geo, { p: 0 }).ok).toBe(false);
  });

  it('整数制約を検証する', () => {
    const r = validateParams(getDistribution('binomial')!, { n: 2.5, p: 0.5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.message).toContain('整数');
  });

  it('数値でない値を拒否する', () => {
    expect(validateParams(getDistribution('t')!, { nu: Number.NaN }).ok).toBe(false);
    expect(validateParams(getDistribution('t')!, {}).ok).toBe(false);
  });

  it('パラメータ間の制約を検証する', () => {
    expect(validateParams(getDistribution('uniform')!, { a: 2, b: 1 }).ok).toBe(false);
    expect(validateParams(getDistribution('hypergeometric')!, { N: 10, K: 12, n: 3 }).ok).toBe(false);
    expect(validateParams(getDistribution('hypergeometric')!, { N: 10, K: 4, n: 11 }).ok).toBe(false);
  });
});

describe('描画範囲', () => {
  it('台が有限なら台の範囲を含む', () => {
    const u = getDistribution('uniform')!;
    const r = plotRange(u, { a: 0, b: 1 });
    expect(r.min).toBeLessThanOrEqual(0);
    expect(r.max).toBeGreaterThanOrEqual(1);
  });
  it('離散分布は整数の範囲を返す', () => {
    const r = plotRange(getDistribution('poisson')!, { lambda: 3 });
    expect(Number.isInteger(r.min) && Number.isInteger(r.max)).toBe(true);
    expect(r.min).toBe(0);
  });
  it('裾の重い分布でも有限の範囲を返す', () => {
    const r = plotRange(getDistribution('cauchy')!, { x0: 0, gamma: 1 });
    expect(Number.isFinite(r.min) && Number.isFinite(r.max)).toBe(true);
  });
});
