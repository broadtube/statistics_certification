import { describe, expect, it } from 'vitest';
import { getDistribution } from '../../src/lib/distributions/registry';
import { distributionSeries } from '../../src/lib/distributions/series';

describe('分布のグラフ用データ', () => {
  it('連続分布は描画範囲を等間隔にサンプリングする', () => {
    const s = distributionSeries(getDistribution('normal')!, { mu: 0, sigma: 1 });
    expect(s.kind).toBe('continuous');
    expect(s.density).toHaveLength(400);
    expect(s.cdf).toHaveLength(400);
    expect(s.range.min).toBeLessThan(-3);
    expect(s.range.max).toBeGreaterThan(3);
  });

  it('離散分布は整数点の確率と階段状の累積分布を返す', () => {
    const s = distributionSeries(getDistribution('binomial')!, { n: 4, p: 0.5 });
    expect(s.density.map((p) => p.x)).toEqual([0, 1, 2, 3, 4]);
    expect(s.density[2]?.y).toBeCloseTo(0.375, 12);
    // 階段: (k, F(k)) → (k+1, F(k)) の繰り返し
    expect(s.cdf.slice(0, 4)).toEqual([
      { x: 0, y: expect.closeTo(0.0625, 12) },
      { x: 1, y: expect.closeTo(0.0625, 12) },
      { x: 1, y: expect.closeTo(0.3125, 12) },
      { x: 2, y: expect.closeTo(0.3125, 12) },
    ]);
  });

  it('離散分布の点数は上限で打ち切る', () => {
    const s = distributionSeries(getDistribution('poisson')!, { lambda: 400 });
    expect(s.density.length).toBeLessThanOrEqual(201);
  });
});
