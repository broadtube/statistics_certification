import { describe, expect, it } from 'vitest';
import { areaPath, createScales, linePath, niceTicks, sampleFunction, yCap } from '../../src/lib/plot/geometry';

describe('目盛', () => {
  it('きりのよい値で目盛を返す', () => {
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(-3.1, 3.1, 6)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(niceTicks(0, 37, 5)).toEqual([0, 10, 20, 30]);
  });
  it('幅0でも1つ以上の目盛を返す', () => {
    expect(niceTicks(2, 2, 5).length).toBeGreaterThan(0);
  });
});

describe('関数のサンプリング', () => {
  it('指定点数で等間隔にサンプリングする', () => {
    const pts = sampleFunction((x) => x * x, 0, 1, 11);
    expect(pts).toHaveLength(11);
    expect(pts[5]).toEqual({ x: 0.5, y: 0.25 });
  });
  it('発散する値は上限で切り詰める', () => {
    const pts = sampleFunction((x) => (x === 0 ? Number.POSITIVE_INFINITY : 1 / Math.sqrt(x)), 0, 1, 101);
    const cap = yCap(pts);
    expect(Number.isFinite(cap)).toBe(true);
    expect(cap).toBeLessThan(20);
  });
  it('有限の値だけなら最大値に少し余白を足した値を上限とする', () => {
    expect(yCap([{ x: 0, y: 0 }, { x: 1, y: 2 }])).toBeCloseTo(2.2, 10);
  });
});

describe('パス生成', () => {
  const sc = createScales({ xMin: 0, xMax: 10, yMin: 0, yMax: 1, width: 110, height: 70, pad: { l: 10, r: 0, t: 0, b: 10 } });
  it('座標変換', () => {
    expect(sc.x(0)).toBe(10);
    expect(sc.x(10)).toBe(110);
    expect(sc.y(0)).toBe(60);
    expect(sc.y(1)).toBe(0);
  });
  it('上限を超える点は上端に切り詰める', () => {
    expect(sc.y(5)).toBe(0);
  });
  it('折れ線パス', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 1 }], sc)).toBe('M10,60L110,0');
  });
  it('塗りつぶし領域は基準線で閉じる', () => {
    const d = areaPath([{ x: 0, y: 0.5 }, { x: 5, y: 1 }], sc);
    expect(d.startsWith('M10,60L10,30')).toBe(true);
    expect(d.endsWith('L60,60Z')).toBe(true);
  });
});
