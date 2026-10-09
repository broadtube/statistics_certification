import { describe, expect, it } from 'vitest';
import { CALCULATOR_DISTRIBUTIONS, computeProbabilities, computeQuantile, formatProbability, formatValue } from '../../src/lib/domain/calculator';

describe('確率計算機', () => {
  it('対象は正規・t・χ²・F の4分布', () => {
    expect(CALCULATOR_DISTRIBUTIONS).toEqual(['normal', 't', 'chisq', 'f']);
  });

  it('値から下側・上側確率（対称な分布は両側も）を計算する', () => {
    const r = computeProbabilities('normal', { mu: 0, sigma: 1 }, 1.96);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lower).toBeCloseTo(0.9750021, 7);
    expect(r.value.upper).toBeCloseTo(0.0249979, 7);
    expect(r.value.twoSided).toBeCloseTo(0.0499958, 7);
    const c = computeProbabilities('chisq', { k: 1 }, 3.841459);
    expect(c.ok && c.value.upper).toBeCloseTo(0.05, 6);
    expect(c.ok && c.value.twoSided).toBeNull();
  });

  it('上側確率は裾でも精度を保つ', () => {
    const r = computeProbabilities('normal', { mu: 0, sigma: 1 }, 8);
    expect(r.ok && r.value.upper).toBeCloseTo(6.220961e-16, 21);
    const t = computeProbabilities('t', { nu: 5 }, 30);
    expect(t.ok && t.value.upper).toBeGreaterThan(0);
  });

  it('確率から分位点を計算する（下側 p 点・上側 α 点）', () => {
    const lo = computeQuantile('t', { nu: 10 }, 0.975, 'lower');
    expect(lo.ok && lo.value).toBeCloseTo(2.228139, 6);
    const up = computeQuantile('f', { d1: 3, d2: 10 }, 0.05, 'upper');
    expect(up.ok && up.value).toBeCloseTo(3.708265, 5);
    const z = computeQuantile('normal', { mu: 50, sigma: 10 }, 0.05, 'upper');
    expect(z.ok && z.value).toBeCloseTo(66.44854, 4);
  });

  it('定義域外の値・不正な確率・不正なパラメータは計算しない', () => {
    expect(computeProbabilities('chisq', { k: 3 }, -1)).toMatchObject({ ok: false, error: { field: 'x' } });
    expect(computeQuantile('normal', { mu: 0, sigma: 1 }, 1, 'lower')).toMatchObject({ ok: false, error: { field: 'p' } });
    expect(computeQuantile('normal', { mu: 0, sigma: 1 }, 0, 'upper')).toMatchObject({ ok: false, error: { field: 'p' } });
    expect(computeProbabilities('normal', { mu: 0, sigma: -1 }, 0)).toMatchObject({ ok: false, error: { field: 'sigma' } });
    expect(computeProbabilities('t', { nu: 3 }, Number.NaN)).toMatchObject({ ok: false, error: { field: 'x' } });
  });
});

describe('表示形式', () => {
  it('確率は小数点以下6桁、1e-4 未満は指数表記', () => {
    expect(formatProbability(0.9750021)).toBe('0.975002');
    expect(formatProbability(0.000123456)).toBe('0.000123');
    expect(formatProbability(6.220961e-16)).toBe('6.2210e-16');
    expect(formatProbability(0)).toBe('0');
    expect(formatProbability(1)).toBe('1.000000');
  });
  it('分位点は小数点以下6桁（大きな値は4桁）', () => {
    expect(formatValue(1.959963985)).toBe('1.959964');
    expect(formatValue(12345.678901)).toBe('12345.6789');
  });
});
