import { describe, expect, it } from 'vitest';
import { validateReferences } from '../../build/content/references';
import type { LoadedContent } from '../../build/content/types';

function fixture(): LoadedContent {
  return {
    categories: [{ id: 'probability', title: '確率', order: 1, mockWeight: 1 }],
    topics: [
      {
        id: 'discrete', file: 'topics/discrete.md', title: '離散分布', category: 'probability', order: 1, summary: 's', draft: false,
        distributions: ['binomial'],
        sections: [{ heading: '定義', markdown: '[[formula:binom-mean]] と [[topic:discrete|ここ]] と [[dist:binomial]]' }],
      },
    ],
    formulas: [{ id: 'binom-mean', file: 'formulas/discrete.yaml', topic: 'discrete', title: 't', body: 'b', tags: [] }],
    distributions: [
      {
        id: 'binomial', file: 'distributions/binomial.yaml', title: '二項', kind: 'discrete', interactive: true, order: 1,
        pmfOrPdf: 'p', mean: 'm', variance: 'v', paramsDoc: [], relations: [], diagramPosition: { x: 0, y: 0 },
      },
    ],
    problems: [
      {
        id: 'p1', file: 'problems/discrete/p1.yaml', topics: ['discrete'], formulas: ['binom-mean'], difficulty: 1, type: 'numeric',
        source: { kind: 'original' }, statement: 's', explanation: 'e', variants: 20, answer: 1, shuffleChoices: true,
      },
    ],
  };
}

const impl = new Set(['binomial']);

describe('参照整合性検証', () => {
  it('整合したコンテンツでは問題を報告しない', () => {
    expect(validateReferences(fixture(), impl)).toEqual([]);
  });

  it('コレクション内のID重複を検出する', () => {
    const c = fixture();
    c.problems.push({ ...c.problems[0]!, file: 'problems/other/p1.yaml' });
    c.formulas.push({ ...c.formulas[0]!, file: 'formulas/other.yaml' });
    const issues = validateReferences(c, impl);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/other/p1.yaml', field: 'id', message: expect.stringContaining('problems/discrete/p1.yaml') }));
    expect(issues).toContainEqual(expect.objectContaining({ file: 'formulas/other.yaml', field: 'id' }));
  });

  it('存在しない分野・公式・分布・大分類への参照を検出する', () => {
    const c = fixture();
    c.topics[0]!.category = 'nope';
    c.topics[0]!.distributions = ['nope-dist'];
    c.formulas[0]!.topic = 'nope-topic';
    c.problems[0]!.topics = ['missing-topic'];
    c.problems[0]!.formulas = ['missing-formula'];
    c.distributions[0]!.relations = [{ to: 'ghost', kind: 'limit', label: 'x' }];
    const fields = validateReferences(c, impl).map((i) => `${i.file}:${i.field}`);
    expect(fields).toEqual(expect.arrayContaining([
      'topics/discrete.md:category',
      'topics/discrete.md:distributions',
      'formulas/discrete.yaml:binom-mean.topic',
      'problems/discrete/p1.yaml:topics',
      'problems/discrete/p1.yaml:formulas',
      'distributions/binomial.yaml:relations',
    ]));
  });

  it('本文中の内部リンク記法の参照切れを検出する', () => {
    const c = fixture();
    c.topics[0]!.sections[0]!.markdown = '[[topic:ghost]] [[formula:none]] [[dist:x]] [[foo:bar]]';
    c.problems[0]!.explanation = '[[formula:also-none]]';
    c.formulas[0]!.pitfalls = '[[topic:ghost2]]';
    const messages = validateReferences(c, impl).map((i) => `${i.file}:${i.message}`);
    expect(messages.join('\n')).toMatch(/topics\/discrete\.md:.*topic:ghost/);
    expect(messages.join('\n')).toMatch(/topics\/discrete\.md:.*formula:none/);
    expect(messages.join('\n')).toMatch(/topics\/discrete\.md:.*dist:x/);
    expect(messages.join('\n')).toMatch(/topics\/discrete\.md:.*foo:bar/);
    expect(messages.join('\n')).toMatch(/problems\/discrete\/p1\.yaml:.*formula:also-none/);
    expect(messages.join('\n')).toMatch(/formulas\/discrete\.yaml:.*topic:ghost2/);
  });

  it('対話型の分布に数値計算の実装がなければ検出する', () => {
    const issues = validateReferences(fixture(), new Set());
    expect(issues).toContainEqual(expect.objectContaining({ file: 'distributions/binomial.yaml', field: 'interactive' }));
  });

  it('分野が1件も無い大分類は問題にしない（空の大分類を許容）', () => {
    const c = fixture();
    c.categories.push({ id: 'empty', title: '空', order: 2, mockWeight: 1 });
    expect(validateReferences(c, impl)).toEqual([]);
  });
});
