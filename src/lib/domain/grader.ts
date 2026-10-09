import type { Problem, Tolerance } from '../types/problem';

export type UserAnswer = { kind: 'choice'; choiceId: string } | { kind: 'numeric'; raw: string };

export type InvalidReason = 'not-a-number' | 'empty';

export type GradeResult =
  | { status: 'graded'; correct: boolean; normalizedAnswer: string }
  | { status: 'invalid-input'; reason: InvalidReason };

export type GradableProblem = Pick<Problem, 'type' | 'digits' | 'tolerance' | 'variants'> & {
  choices: { id: string; correct: boolean }[] | null;
};

const FULLWIDTH: Record<string, string> = {
  '．': '.', '，': ',', '－': '-', '−': '-', '‐': '-', '＋': '+', '／': '/', 'ｅ': 'e', 'Ｅ': 'E', '　': ' ',
};

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/** 全角文字・桁区切りを正規化し、小数・指数表記・分数を数値として解釈する */
export function parseNumericInput(raw: string): { ok: true; value: number; normalized: string } | { ok: false; reason: InvalidReason } {
  const s = raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．，－−‐＋／ｅＥ　]/g, (c) => FULLWIDTH[c] ?? c)
    .trim()
    .replace(/,/g, '')
    .replace(/\s+/g, '');
  if (s === '') return { ok: false, reason: 'empty' };

  const parts = s.split('/');
  if (parts.length > 2) return { ok: false, reason: 'not-a-number' };
  if (!parts.every((p) => NUMBER_RE.test(p))) return { ok: false, reason: 'not-a-number' };
  const value = parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(parts[0]);
  if (!Number.isFinite(value)) return { ok: false, reason: 'not-a-number' };
  return { ok: true, value, normalized: s };
}

/** 問題の許容誤差。未指定なら表示桁の半単位、桁指定もなければ相対 0.1% */
export function defaultTolerance(p: Pick<Problem, 'digits' | 'tolerance'>): Tolerance {
  if (p.tolerance) return p.tolerance;
  if (p.digits !== null) return { type: 'absolute', value: Number((0.5 * 10 ** -p.digits).toPrecision(12)) };
  return { type: 'relative', value: 0.001 };
}

export function withinTolerance(x: number, answer: number, tol: Tolerance): boolean {
  const limit = tol.type === 'absolute' ? tol.value : tol.value * Math.abs(answer);
  // 浮動小数点の丸め誤差で境界値が不正解にならないよう、わずかに余裕を持たせる
  return Math.abs(x - answer) <= limit * (1 + 1e-9) + 1e-12;
}

export function gradeAnswer(problem: GradableProblem, variantIndex: number, answer: UserAnswer): GradeResult {
  if (answer.kind === 'choice') {
    const correct = problem.choices?.find((c) => c.id === answer.choiceId)?.correct === true;
    return { status: 'graded', correct, normalizedAnswer: answer.choiceId };
  }
  const parsed = parseNumericInput(answer.raw);
  if (!parsed.ok) return { status: 'invalid-input', reason: parsed.reason };
  const expected = problem.variants[variantIndex]?.answer;
  const correct = expected !== null && expected !== undefined && withinTolerance(parsed.value, expected, defaultTolerance(problem));
  return { status: 'graded', correct, normalizedAnswer: parsed.normalized };
}

export function describeInvalid(reason: InvalidReason): string {
  return reason === 'empty' ? '数値を入力してください。' : '数値として解釈できません（例: 1.96、-0.5、3/4、1.2e-3）。';
}
