import { describe, expect, it } from 'vitest';
import { createEvaluator } from '../../build/variants/evaluator';

const ev = createEvaluator();

describe('ビルド時の安全な式評価', () => {
  it('四則演算とスコープ変数を評価する', () => {
    expect(ev.evaluate('n * p', { n: 20, p: 0.3 })).toBeCloseTo(6, 12);
    expect(ev.evaluate('sqrt(n * p * (1 - p))', { n: 100, p: 0.5 })).toBeCloseTo(5, 12);
    expect(ev.evaluate(3, {})).toBe(3);
  });

  it('統計関数を利用できる', () => {
    expect(ev.evaluate('qnorm(0.975)', {})).toBeCloseTo(1.959964, 6);
    expect(ev.evaluate('qt(0.975, n - 1)', { n: 11 })).toBeCloseTo(2.228139, 6);
    expect(ev.evaluate('choose(n, 2)', { n: 5 })).toBe(10);
  });

  it('真偽値の式（制約）を評価する', () => {
    expect(ev.evaluate('n > 3 and p < 0.5', { n: 4, p: 0.2 })).toBe(true);
    expect(ev.evaluate('a != b', { a: 1, b: 1 })).toBe(false);
  });

  it('危険な機能は無効化されている', () => {
    expect(() => ev.evaluate('import({}, {})', {})).toThrow();
    expect(() => ev.evaluate('evaluate("1+1")', {})).toThrow();
    expect(() => ev.evaluate('parse("1")', {})).toThrow();
    expect(() => ev.evaluate('createUnit("foo")', {})).toThrow();
  });

  it('未定義の変数はエラーにする', () => {
    expect(() => ev.evaluate('n + zzz', { n: 1 })).toThrow(/zzz/);
  });

  it('数値・真偽値以外の結果はエラーにする', () => {
    expect(() => ev.evaluate('[1, 2]', {})).toThrow(/数値/);
    expect(() => ev.evaluate('"abc"', {})).toThrow(/数値/);
  });
});
