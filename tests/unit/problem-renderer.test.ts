import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { CHOICE_LABELS, choiceOrderFor, renderMathInHtml, renderProblem } from '../../src/lib/render/problem';
import { createRng } from '../../src/lib/random';
import type { Problem } from '../../src/lib/types/problem';

const problem = (over: Partial<Problem> = {}): Problem => ({
  id: 'p', topics: ['t'], category: 'c', formulas: [], difficulty: 1, type: 'numeric',
  statementHtml: '<p><span class="tex" data-tex="B({{n}}, 0.5)" data-display="false">B({{n}}, 0.5)</span> の期待値。n={{n}}</p>',
  explanationHtml: '<div class="tex" data-tex="np = {{answer}}" data-display="true">np = {{answer}}</div>',
  choices: null, shuffleChoices: true, digits: 1, tolerance: null,
  variants: [{ values: { n: '10', answer: '5.0' }, answer: 5 }, { values: { n: '20', answer: '10.0' }, answer: 10 }],
  sourceLabel: 'オリジナル', topicLinks: [], formulaLinks: [],
  ...over,
});

describe('数式の描画', () => {
  it('data-tex を KaTeX で描画する（属性の文字参照を復元）', () => {
    const html = renderMathInHtml('<span class="tex" data-tex="a&#x22;b &#x3C; c" data-display="false">x</span>', katex);
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('data-tex');
  });
  it('ディスプレイ数式', () => {
    expect(renderMathInHtml('<div class="tex" data-tex="x^2" data-display="true">x^2</div>', katex)).toContain('katex-display');
  });
  it('LaTeX の誤りは元の文字列をそのまま表示する', () => {
    const html = renderMathInHtml('<span class="tex" data-tex="\\frac{" data-display="false">\\frac{</span>', katex);
    expect(html).toContain('tex-error');
  });
});

describe('問題の描画', () => {
  it('類題の値を差し込み、差し込み記号を残さない', () => {
    const r = renderProblem(problem(), 1, null, katex);
    expect(r.statementHtml).toContain('n=20');
    expect(r.statementHtml).toContain('class="katex"');
    expect(r.statementHtml + r.explanationHtml).not.toContain('{{');
    expect(r.answerDisplay).toBe('10.0');
  });

  it('選択肢を指定順に並べ、表示ラベルを付ける', () => {
    const p = problem({
      type: 'choice',
      choices: [
        { id: 'a', html: '<p>A {{n}}</p>', correct: false },
        { id: 'b', html: '<p>B</p>', correct: true },
        { id: 'c', html: '<p>C</p>', correct: false },
      ],
    });
    const r = renderProblem(p, 0, ['c', 'b', 'a'], katex);
    expect(r.choices?.map((c) => c.id)).toEqual(['c', 'b', 'a']);
    expect(r.choices?.map((c) => c.label)).toEqual([CHOICE_LABELS[0], CHOICE_LABELS[1], CHOICE_LABELS[2]]);
    expect(r.choices?.[2]?.html).toContain('A 10');
    expect(r.answerDisplay).toBe(`${CHOICE_LABELS[1]}`);
    expect(r.correctChoiceId).toBe('b');
  });

  it('シャッフル指定に従って選択肢の順序を決める', () => {
    const p = problem({ type: 'choice', choices: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, html: id, correct: id === 'a' })) });
    expect(choiceOrderFor({ ...p, shuffleChoices: false }, createRng(1))).toEqual(['a', 'b', 'c', 'd', 'e']);
    const shuffled = choiceOrderFor(p, createRng(1));
    expect([...(shuffled ?? [])].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(choiceOrderFor(problem(), createRng(1))).toBeNull();
  });
});
