import { describe, expect, it } from 'vitest';
import type { LoadedContent } from '../../build/content/types';
import { countsByTopic, formulasOfTopic, problemsOfFormula, problemsOfTopic, topicsByCategory } from '../../build/site/queries';

const content: LoadedContent = {
  categories: [{ id: 'b', title: 'B', order: 2, mockWeight: 1 }, { id: 'a', title: 'A', order: 1, mockWeight: 1 }],
  topics: [
    { id: 't2', file: '', title: 'T2', category: 'a', order: 2, summary: '', draft: false, sections: [] },
    { id: 't1', file: '', title: 'T1', category: 'a', order: 1, summary: '', draft: false, sections: [] },
    { id: 't3', file: '', title: 'T3', category: 'b', order: 1, summary: '', draft: false, sections: [] },
  ],
  formulas: [
    { id: 'f1', file: '', topic: 't1', title: '', body: 'x', tags: [] },
    { id: 'f2', file: '', topic: 't1', title: '', body: 'x', tags: [] },
  ],
  distributions: [],
  problems: [
    { id: 'p1', file: '', topics: ['t1', 't3'], formulas: ['f1'], difficulty: 1, type: 'numeric', source: { kind: 'original' }, statement: '', explanation: '', variants: 1, shuffleChoices: true, answer: 1 },
    { id: 'p2', file: '', topics: ['t1'], formulas: [], difficulty: 1, type: 'numeric', source: { kind: 'original' }, statement: '', explanation: '', variants: 1, shuffleChoices: true, answer: 1 },
  ],
};

describe('ページ生成用のクエリ', () => {
  it('大分類ごとに分野を表示順でまとめる', () => {
    expect(topicsByCategory(content).map((g) => [g.category.id, g.topics.map((t) => t.id)])).toEqual([
      ['a', ['t1', 't2']],
      ['b', ['t3']],
    ]);
  });
  it('分野ごとの公式数と問題数（複数分野の問題は各分野に計上）', () => {
    const c = countsByTopic(content);
    expect(c.get('t1')).toEqual({ formulas: 2, problems: 2 });
    expect(c.get('t3')).toEqual({ formulas: 0, problems: 1 });
    expect(c.get('t2')).toEqual({ formulas: 0, problems: 0 });
  });
  it('分野・公式に紐付く問題と公式', () => {
    expect(problemsOfTopic(content, 't3').map((p) => p.id)).toEqual(['p1']);
    expect(formulasOfTopic(content, 't1').map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(problemsOfFormula(content, 'f1').map((p) => p.id)).toEqual(['p1']);
  });
});
