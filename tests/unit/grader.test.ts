import { describe, expect, it } from 'vitest';
import { defaultTolerance, gradeAnswer, parseNumericInput, type GradableProblem } from '../../src/lib/domain/grader';

const numeric = (answer: number, over: Partial<GradableProblem> = {}): GradableProblem => ({
  type: 'numeric', choices: null, digits: 3, tolerance: null, variants: [{ values: {}, answer }], ...over,
});

describe('数値入力の正規化', () => {
  it.each([
    ['1.96', 1.96],
    ['  -0.5 ', -0.5],
    ['１．９６', 1.96],
    ['－２', -2],
    ['−2', -2],
    ['1,234.5', 1234.5],
    ['1.2e-3', 0.0012],
    ['1.2E+2', 120],
    ['3/4', 0.75],
    ['-1/8', -0.125],
    ['３／４', 0.75],
    ['.5', 0.5],
    ['+7', 7],
  ])('"%s" → %d', (raw, value) => {
    const r = parseNumericInput(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(value, 12);
  });

  it.each([['', 'empty'], ['   ', 'empty'], ['abc', 'not-a-number'], ['1..2', 'not-a-number'], ['1/0', 'not-a-number'], ['1/', 'not-a-number'], ['--1', 'not-a-number']])(
    '"%s" は %s',
    (raw, reason) => {
      expect(parseNumericInput(raw)).toEqual({ ok: false, reason });
    },
  );
});

describe('既定の許容誤差', () => {
  it('表示桁数の半単位（絶対誤差）', () => {
    expect(defaultTolerance(numeric(1, { digits: 3 }))).toEqual({ type: 'absolute', value: 0.0005 });
    expect(defaultTolerance(numeric(1, { digits: 0 }))).toEqual({ type: 'absolute', value: 0.5 });
  });
  it('桁数指定がなければ相対誤差 0.1%', () => {
    expect(defaultTolerance(numeric(1, { digits: null }))).toEqual({ type: 'relative', value: 0.001 });
  });
  it('問題に指定があればそれを使う', () => {
    expect(defaultTolerance(numeric(1, { tolerance: { type: 'relative', value: 0.05 } }))).toEqual({ type: 'relative', value: 0.05 });
  });
});

describe('解答判定', () => {
  it('絶対誤差の境界（境界値は正解）', () => {
    const p = numeric(1.959964, { digits: 2 });
    expect(gradeAnswer(p, 0, { kind: 'numeric', raw: '1.96' })).toMatchObject({ status: 'graded', correct: true, normalizedAnswer: '1.96' });
    expect(gradeAnswer(numeric(2, { digits: 1 }), 0, { kind: 'numeric', raw: '2.05' })).toMatchObject({ correct: true });
    expect(gradeAnswer(numeric(2, { digits: 1 }), 0, { kind: 'numeric', raw: '2.0501' })).toMatchObject({ correct: false });
  });

  it('相対誤差', () => {
    const p = numeric(200, { tolerance: { type: 'relative', value: 0.01 } });
    expect(gradeAnswer(p, 0, { kind: 'numeric', raw: '202' })).toMatchObject({ correct: true });
    expect(gradeAnswer(p, 0, { kind: 'numeric', raw: '202.1' })).toMatchObject({ correct: false });
  });

  it('類題ごとの正答で判定する', () => {
    const p = numeric(0, { digits: 0, variants: [{ values: {}, answer: 10 }, { values: {}, answer: 20 }] });
    expect(gradeAnswer(p, 1, { kind: 'numeric', raw: '20' })).toMatchObject({ correct: true });
    expect(gradeAnswer(p, 0, { kind: 'numeric', raw: '20' })).toMatchObject({ correct: false });
  });

  it('不正な入力は判定しない', () => {
    expect(gradeAnswer(numeric(1), 0, { kind: 'numeric', raw: '' })).toEqual({ status: 'invalid-input', reason: 'empty' });
    expect(gradeAnswer(numeric(1), 0, { kind: 'numeric', raw: 'x' })).toEqual({ status: 'invalid-input', reason: 'not-a-number' });
  });

  it('選択式は選択肢IDで判定する', () => {
    const p: GradableProblem = {
      type: 'choice', digits: null, tolerance: null, variants: [{ values: {}, answer: null }],
      choices: [{ id: 'a', correct: false }, { id: 'b', correct: true }],
    };
    expect(gradeAnswer(p, 0, { kind: 'choice', choiceId: 'b' })).toEqual({ status: 'graded', correct: true, normalizedAnswer: 'b' });
    expect(gradeAnswer(p, 0, { kind: 'choice', choiceId: 'a' })).toEqual({ status: 'graded', correct: false, normalizedAnswer: 'a' });
  });
});
