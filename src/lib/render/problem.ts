import type { Rng } from '../random';
import { shuffle } from '../random';
import { escapeHtml, fillPlaceholders } from '../template';
import type { Problem } from '../types/problem';

/** KaTeX のうち本モジュールが使う部分（遅延読込したモジュールを受け取る） */
export interface KatexLike {
  renderToString(tex: string, options: { displayMode: boolean; throwOnError: boolean; strict: 'ignore' }): string;
}

export const CHOICE_LABELS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'] as const;

export interface RenderedChoice {
  id: string;
  label: string;
  html: string;
}

export interface RenderedProblem {
  statementHtml: string;
  choices: RenderedChoice[] | null;
  explanationHtml: string;
  /** 正答の表示（数値入力は表示用に整形した値、選択式はラベル） */
  answerDisplay: string;
  correctChoiceId: string | null;
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(Number.parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number.parseInt(e.slice(1), 10));
    return ENTITY[e] ?? m;
  });
}

const TEX_NODE = /<(span|div) class="tex" data-tex="([^"]*)" data-display="(true|false)">[\s\S]*?<\/\1>/g;

/** ビルド時に残した数式（data-tex）を KaTeX で描画する */
export function renderMathInHtml(html: string, katex: KatexLike): string {
  return html.replace(TEX_NODE, (_m, tag: string, encoded: string, display: string) => {
    const tex = decodeEntities(encoded);
    try {
      return katex.renderToString(tex, { displayMode: display === 'true', throwOnError: true, strict: 'ignore' });
    } catch {
      return `<${tag} class="tex-error" title="数式を表示できませんでした">${escapeHtml(tex)}</${tag}>`;
    }
  });
}

/** 選択肢の表示順（シャッフル指定がなければ定義順、選択式でなければ null） */
export function choiceOrderFor(problem: Pick<Problem, 'choices' | 'shuffleChoices'>, rng: Rng): string[] | null {
  if (!problem.choices) return null;
  const ids = problem.choices.map((c) => c.id);
  return problem.shuffleChoices ? shuffle(ids, rng) : ids;
}

/** 類題の値を差し込み、数式を描画した問題を返す（要件6.3, 6.4, 7.1, 7.5） */
export function renderProblem(problem: Problem, variantIndex: number, choiceOrder: readonly string[] | null, katex: KatexLike): RenderedProblem {
  const variant = problem.variants[variantIndex] ?? problem.variants[0];
  const values = variant?.values ?? {};
  const fill = (html: string) => renderMathInHtml(fillPlaceholders(html, values, { escapeHtml: true }), katex);

  let choices: RenderedChoice[] | null = null;
  let answerDisplay = values.answer ?? (variant?.answer !== null && variant?.answer !== undefined ? String(variant.answer) : '');
  let correctChoiceId: string | null = null;
  if (problem.choices) {
    const byId = new Map(problem.choices.map((c) => [c.id, c]));
    const order = choiceOrder ?? problem.choices.map((c) => c.id);
    choices = order
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((c, i) => ({ id: c.id, label: CHOICE_LABELS[i] ?? String(i + 1), html: fill(c.html) }));
    const correct = choices.find((c) => byId.get(c.id)?.correct);
    correctChoiceId = correct?.id ?? null;
    answerDisplay = correct?.label ?? '';
  }

  return { statementHtml: fill(problem.statementHtml), choices, explanationHtml: fill(problem.explanationHtml), answerDisplay, correctChoiceId };
}

let katexPromise: Promise<KatexLike> | undefined;

/** KaTeX を初めて必要になった時点で読み込む */
export function loadKatex(): Promise<KatexLike> {
  katexPromise ??= import('katex').then((m) => m.default as unknown as KatexLike);
  return katexPromise;
}
