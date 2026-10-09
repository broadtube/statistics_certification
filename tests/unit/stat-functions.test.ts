import { describe, expect, it } from 'vitest';
import { STAT_FUNCTIONS } from '../../src/lib/stats/functions';

describe('統計関数（数表との一致）', () => {
  it('正規分布', () => {
    expect(STAT_FUNCTIONS.qnorm(0.975)).toBeCloseTo(1.959964, 6);
    expect(STAT_FUNCTIONS.pnorm(1.96)).toBeCloseTo(0.9750021, 6);
    expect(STAT_FUNCTIONS.pnorm(12, 10, 2)).toBeCloseTo(0.8413447, 6);
    expect(STAT_FUNCTIONS.qnorm(0.95, 50, 10)).toBeCloseTo(66.44854, 4);
  });
  it('t分布', () => {
    expect(STAT_FUNCTIONS.qt(0.975, 10)).toBeCloseTo(2.228139, 6);
    expect(STAT_FUNCTIONS.pt(2.228139, 10)).toBeCloseTo(0.975, 6);
  });
  it('カイ二乗分布', () => {
    expect(STAT_FUNCTIONS.qchisq(0.95, 5)).toBeCloseTo(11.0705, 4);
    expect(STAT_FUNCTIONS.pchisq(3.841459, 1)).toBeCloseTo(0.95, 6);
  });
  it('F分布', () => {
    expect(STAT_FUNCTIONS.qf(0.95, 3, 10)).toBeCloseTo(3.708265, 5);
    expect(STAT_FUNCTIONS.pf(3.708265, 3, 10)).toBeCloseTo(0.95, 6);
  });
  it('離散分布と特殊関数', () => {
    expect(STAT_FUNCTIONS.dbinom(2, 5, 0.5)).toBeCloseTo(0.3125, 10);
    expect(STAT_FUNCTIONS.pbinom(2, 5, 0.5)).toBeCloseTo(0.5, 10);
    expect(STAT_FUNCTIONS.dpois(0, 2)).toBeCloseTo(Math.exp(-2), 10);
    expect(STAT_FUNCTIONS.ppois(1, 2)).toBeCloseTo(3 * Math.exp(-2), 10);
    expect(STAT_FUNCTIONS.choose(5, 2)).toBe(10);
    expect(STAT_FUNCTIONS.gammafn(5)).toBeCloseTo(24, 10);
    expect(STAT_FUNCTIONS.betafn(2, 3)).toBeCloseTo(1 / 12, 10);
  });
});
