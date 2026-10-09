import { describe, expect, it } from 'vitest';
import type { ProblemSource } from '../../build/content/types';
import { formatNumber, generateVariants } from '../../build/variants/generate';

function problem(over: Partial<ProblemSource>): ProblemSource {
  return {
    id: 'p1',
    file: 'problems/x/p1.yaml',
    topics: ['x'],
    formulas: [],
    difficulty: 1,
    type: 'numeric',
    source: { kind: 'original' },
    statement: '問題',
    explanation: '解説',
    variants: 20,
    shuffleChoices: true,
    ...over,
  };
}

describe('数値の表示整形', () => {
  it('桁数指定があれば固定小数で表示する', () => {
    expect(formatNumber(2.228139, 3)).toBe('2.228');
    expect(formatNumber(6, 2)).toBe('6.00');
  });
  it('桁数指定がなければ整数はそのまま、小数は有効数字6桁で表示する', () => {
    expect(formatNumber(6)).toBe('6');
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1 / 3)).toBe('0.333333');
    expect(formatNumber(-0)).toBe('0');
  });
});

describe('類題の事前生成', () => {
  const base = problem({
    statement: '$B({{n}}, {{p}})$ の期待値は？',
    explanation: '$np = {{answer}}$、分散は {{v}}',
    params: { n: { min: 10, max: 30, step: 1 }, p: { min: 0.1, max: 0.9, step: 0.1 } },
    derived: { v: 'n * p * (1 - p)' },
    answer: 'n * p',
    display: { digits: 1 },
  });

  it('パラメータ・中間値・正答を算出し、表示用に整形する', () => {
    const r = generateVariants(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.variants).toHaveLength(20);
    for (const v of r.variants) {
      const n = Number(v.values.n);
      const p = Number(v.values.p);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(30);
      expect(v.values.p).toMatch(/^0\.\d$/);
      expect(v.answer).toBeCloseTo(n * p, 10);
      expect(v.values.answer).toBe((n * p).toFixed(1));
      expect(v.values.v).toBe((n * p * (1 - p)).toFixed(1));
    }
  });

  it('同じ入力からは常に同じ類題を生成する', () => {
    expect(generateVariants(base)).toEqual(generateVariants(base));
  });

  it('パラメータの組は重複しない', () => {
    const r = generateVariants(base);
    if (!r.ok) throw new Error('unexpected');
    const keys = r.variants.map((v) => `${v.values.n},${v.values.p}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('組合せ数が指定数より少なければ全組合せで打ち切る', () => {
    const r = generateVariants(problem({ params: { n: { min: 1, max: 3, step: 1 } }, answer: 'n', statement: '{{n}}' }));
    expect(r.ok && r.variants.map((v) => v.values.n).sort()).toEqual(['1', '2', '3']);
  });

  it('制約を満たす組のみを生成する', () => {
    const r = generateVariants(problem({
      params: { a: { min: 1, max: 9, step: 1 }, b: { min: 1, max: 9, step: 1 } },
      constraints: ['a < b'],
      answer: 'b - a',
      statement: '{{a}} {{b}}',
    }));
    expect(r.ok).toBe(true);
    if (r.ok) for (const v of r.variants) expect(Number(v.values.a)).toBeLessThan(Number(v.values.b));
  });

  it('制約を満たせない場合は制約充足不能エラー', () => {
    const r = generateVariants(problem({
      params: { a: { min: 1, max: 1000, step: 1 }, b: { min: 1, max: 1000, step: 1 } },
      constraints: ['a > 2000'],
      answer: 'a',
    }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'constraint-unsatisfiable', problemId: 'p1' } });
  });

  it('正答が有限値でなければエラー', () => {
    const r = generateVariants(problem({ params: { n: { min: 1, max: 3, step: 1 } }, answer: '1 / (n - n)' }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'non-finite-answer' } });
  });

  it('式の評価に失敗したら式とともにエラー', () => {
    const r = generateVariants(problem({ params: { n: { min: 1, max: 3, step: 1 } }, answer: 'n + undefinedVar' }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'evaluation-failed', expression: 'n + undefinedVar' } });
  });

  it('選択肢の値が重複したらエラー', () => {
    const r = generateVariants(problem({
      type: 'choice',
      params: { n: { min: 2, max: 4, step: 1 } },
      choices: [
        { id: 'a', text: '{{choice_a}}', value: 'n * 2', correct: true },
        { id: 'b', text: '{{choice_b}}', value: 'n + n', correct: false },
      ],
    }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'choice-collision' } });
  });

  it('選択肢の値を choice_<id> として差し込める', () => {
    const r = generateVariants(problem({
      type: 'choice',
      params: { n: { min: 2, max: 4, step: 1 } },
      display: { digits: 0 },
      choices: [
        { id: 'a', text: '{{choice_a}}', value: 'n * 2', correct: true },
        { id: 'b', text: '{{choice_b}}', value: 'n * 3', correct: false },
      ],
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.variants[0]?.values).toHaveProperty('choice_b');
  });

  it('未定義の差し込み記号があればエラー', () => {
    const r = generateVariants(problem({ params: { n: { min: 1, max: 3, step: 1 } }, answer: 'n', statement: '{{m}} 回' }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'unknown-placeholder', name: 'm' } });
  });

  it('パラメータを持たない問題は1つの固定インスタンスを生成する', () => {
    const r = generateVariants(problem({ answer: 'qnorm(0.975)', display: { digits: 3 }, explanation: '{{answer}}' }));
    expect(r.ok && r.variants).toEqual([{ values: { answer: '1.960' }, answer: expect.closeTo(1.959964, 6) }]);
  });

  it('選択式で正答式がなければ answer は null', () => {
    const r = generateVariants(problem({
      type: 'choice',
      choices: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: false },
      ],
    }));
    expect(r.ok && r.variants).toEqual([{ values: {}, answer: null }]);
  });
});
