import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from '../../src/lib/random';

describe('シード付き乱数', () => {
  it('同じシードからは同じ系列を生成する', () => {
    const a = createRng('binom-mean-1');
    const b = createRng('binom-mean-1');
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('異なるシードでは異なる系列になる', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });
  it('int は両端を含む範囲の整数を返す', () => {
    const r = createRng(1);
    const xs = Array.from({ length: 200 }, () => r.int(0, 2));
    expect(new Set(xs)).toEqual(new Set([0, 1, 2]));
  });
  it('shuffle は要素を保存した新しい配列を返す', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, createRng(3));
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});
