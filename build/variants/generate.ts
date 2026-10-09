import { createRng, shuffle, type Rng } from '../../src/lib/random';
import type { ProblemSource } from '../content/types';
import { createEvaluator, type Evaluator, type Scope } from './evaluator';

export interface ProblemVariant {
  /** 差し込み用の表示文字列（params・derived・answer・choice_<id>） */
  values: Record<string, string>;
  /** 判定用の正答（選択式で answer 未定義なら null） */
  answer: number | null;
}

export type VariantError =
  | { kind: 'constraint-unsatisfiable'; problemId: string; tries: number }
  | { kind: 'evaluation-failed'; problemId: string; expression: string; message: string }
  | { kind: 'non-finite-answer'; problemId: string; name: string; params: Record<string, number> }
  | { kind: 'choice-collision'; problemId: string; params: Record<string, number> }
  | { kind: 'unknown-placeholder'; problemId: string; name: string };

export type VariantResult = { ok: true; variants: ProblemVariant[] } | { ok: false; error: VariantError };

/** 全組合せを列挙する上限（これを超える場合は無作為抽出する） */
const ENUMERATE_LIMIT = 20_000;
/** 無作為抽出で連続して失敗してよい回数 */
const MAX_CONSECUTIVE_FAILURES = 1_000;

export const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function formatNumber(x: number, digits?: number): string {
  let s: string;
  if (digits !== undefined) s = x.toFixed(digits);
  else if (Number.isInteger(x)) s = String(x);
  else s = String(Number(x.toPrecision(6)));
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

function decimalsOf(step: number): number {
  const s = String(step);
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  return s.includes('.') ? (s.split('.')[1]?.length ?? 0) : 0;
}

interface ParamAxis {
  name: string;
  values: number[];
  decimals: number;
}

function axesOf(problem: ProblemSource): ParamAxis[] {
  return Object.entries(problem.params ?? {}).map(([name, r]) => {
    const decimals = decimalsOf(r.step);
    const count = Math.floor((r.max - r.min) / r.step + 1e-9) + 1;
    const values = Array.from({ length: count }, (_, k) => Number((r.min + k * r.step).toFixed(decimals)));
    return { name, values, decimals };
  });
}

class VariantFailure extends Error {
  constructor(readonly error: VariantError) {
    super(error.kind);
  }
}

export function placeholdersOf(problem: ProblemSource): string[] {
  const texts = [problem.statement, problem.explanation, ...(problem.choices ?? []).map((c) => c.text)];
  const names = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(PLACEHOLDER_RE)) names.add(m[1] ?? '');
  return [...names];
}

function availableNames(problem: ProblemSource): Set<string> {
  const names = new Set<string>([...Object.keys(problem.params ?? {}), ...Object.keys(problem.derived ?? {})]);
  if (problem.answer !== undefined) names.add('answer');
  for (const c of problem.choices ?? []) if (c.value !== undefined) names.add(`choice_${c.id}`);
  return names;
}

function instantiate(problem: ProblemSource, axes: readonly ParamAxis[], params: Scope, ev: Evaluator): ProblemVariant | null {
  const digits = problem.display?.digits;
  const scope: Scope = { ...params };
  const values: Record<string, string> = {};
  for (const a of axes) values[a.name] = (params[a.name] ?? 0).toFixed(a.decimals);

  const evalNum = (name: string, expr: string | number): number => {
    let v: number | boolean;
    try {
      v = ev.evaluate(expr, scope);
    } catch (e) {
      throw new VariantFailure({ kind: 'evaluation-failed', problemId: problem.id, expression: String(expr), message: (e as Error).message });
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new VariantFailure({ kind: 'non-finite-answer', problemId: problem.id, name, params: { ...params } });
    }
    return v;
  };

  for (const [name, expr] of Object.entries(problem.derived ?? {})) {
    const v = evalNum(name, expr);
    scope[name] = v;
    values[name] = formatNumber(v, digits);
  }

  for (const c of problem.constraints ?? []) {
    let ok: number | boolean;
    try {
      ok = ev.evaluate(c, scope);
    } catch (e) {
      throw new VariantFailure({ kind: 'evaluation-failed', problemId: problem.id, expression: c, message: (e as Error).message });
    }
    if (typeof ok !== 'boolean') {
      throw new VariantFailure({ kind: 'evaluation-failed', problemId: problem.id, expression: c, message: '制約式の結果が真偽値ではありません' });
    }
    if (!ok) return null;
  }

  let answer: number | null = null;
  if (problem.answer !== undefined) {
    answer = evalNum('answer', problem.answer);
    values.answer = formatNumber(answer, digits);
  }

  const shown = new Set<string>();
  for (const c of problem.choices ?? []) {
    if (c.value === undefined) continue;
    const s = formatNumber(evalNum(`choice_${c.id}`, c.value), digits);
    if (shown.has(s)) throw new VariantFailure({ kind: 'choice-collision', problemId: problem.id, params: { ...params } });
    shown.add(s);
    values[`choice_${c.id}`] = s;
  }
  return { values, answer };
}

function paramsAt(axes: readonly ParamAxis[], indices: readonly number[]): Scope {
  const s: Scope = {};
  axes.forEach((a, i) => {
    s[a.name] = a.values[indices[i] ?? 0] ?? 0;
  });
  return s;
}

function enumerateAll(axes: readonly ParamAxis[]): Scope[] {
  let combos: number[][] = [[]];
  for (const a of axes) combos = combos.flatMap((c) => a.values.map((_, i) => [...c, i]));
  return combos.map((c) => paramsAt(axes, c));
}

/**
 * 問題から類題インスタンスを事前生成する（要件7.1–7.3, 13.5）。
 * シードは問題IDとし、同じ入力からは常に同じ結果を返す。
 */
export function generateVariants(problem: ProblemSource, evaluator: Evaluator = createEvaluator()): VariantResult {
  const available = availableNames(problem);
  for (const name of placeholdersOf(problem)) {
    if (!available.has(name)) return { ok: false, error: { kind: 'unknown-placeholder', problemId: problem.id, name } };
  }

  const axes = axesOf(problem);
  const rng: Rng = createRng(problem.id);
  const target = problem.variants;
  const variants: ProblemVariant[] = [];

  try {
    if (axes.length === 0) {
      const v = instantiate(problem, axes, {}, evaluator);
      if (!v) return { ok: false, error: { kind: 'constraint-unsatisfiable', problemId: problem.id, tries: 1 } };
      return { ok: true, variants: [v] };
    }

    const total = axes.reduce((n, a) => n * a.values.length, 1);
    if (total <= ENUMERATE_LIMIT) {
      for (const params of shuffle(enumerateAll(axes), rng)) {
        const v = instantiate(problem, axes, params, evaluator);
        if (v) variants.push(v);
        if (variants.length >= target) break;
      }
      if (variants.length === 0) return { ok: false, error: { kind: 'constraint-unsatisfiable', problemId: problem.id, tries: total } };
    } else {
      const seen = new Set<string>();
      let failures = 0;
      let tries = 0;
      while (variants.length < target && failures < MAX_CONSECUTIVE_FAILURES) {
        tries++;
        const indices = axes.map((a) => rng.int(0, a.values.length - 1));
        const key = indices.join(',');
        if (seen.has(key)) {
          failures++;
          continue;
        }
        seen.add(key);
        const v = instantiate(problem, axes, paramsAt(axes, indices), evaluator);
        if (v) {
          variants.push(v);
          failures = 0;
        } else failures++;
      }
      if (variants.length === 0) return { ok: false, error: { kind: 'constraint-unsatisfiable', problemId: problem.id, tries } };
    }
  } catch (e) {
    if (e instanceof VariantFailure) return { ok: false, error: e.error };
    throw e;
  }
  return { ok: true, variants };
}

export function describeVariantError(e: VariantError): string {
  switch (e.kind) {
    case 'constraint-unsatisfiable':
      return `制約を満たすパラメータが見つかりません（${e.tries} 回試行）`;
    case 'evaluation-failed':
      return `式 "${e.expression}" の評価に失敗しました: ${e.message}`;
    case 'non-finite-answer':
      return `${e.name} が有限の数値になりません（params: ${JSON.stringify(e.params)}）`;
    case 'choice-collision':
      return `選択肢の値が重複しています（params: ${JSON.stringify(e.params)}）`;
    case 'unknown-placeholder':
      return `差し込み記号 {{${e.name}}} に対応する params / derived / answer / choice_<id> がありません`;
  }
}
