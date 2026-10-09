import { describe, expect, it } from 'vitest';
import { filterFormulas, type FilterableFormula } from '../../src/lib/domain/formula-filter';

const items: FilterableFormula[] = [
  { id: 'binom-mean', topic: 'discrete', tags: ['期待値', '二項分布'], text: '二項分布の期待値 E[X]=np' },
  { id: 'pois-var', topic: 'discrete', tags: ['分散'], text: 'ポアソン分布の分散' },
  { id: 'ols', topic: 'regression', tags: ['推定量', '最小二乗法'], text: 'OLS推定量 最小二乗法' },
];

describe('公式の検索・絞り込み', () => {
  it('条件なしなら全件', () => {
    expect(filterFormulas(items, { query: '', topics: [], tags: [] })).toEqual(['binom-mean', 'pois-var', 'ols']);
  });
  it('公式名・説明・タグの部分一致（大文字小文字・全角半角を区別しない）', () => {
    expect(filterFormulas(items, { query: 'ols', topics: [], tags: [] })).toEqual(['ols']);
    expect(filterFormulas(items, { query: 'ＯＬＳ', topics: [], tags: [] })).toEqual(['ols']);
    expect(filterFormulas(items, { query: '分散', topics: [], tags: [] })).toEqual(['pois-var']);
  });
  it('空白区切りの複数語はすべてを含むものに絞る', () => {
    expect(filterFormulas(items, { query: '二項 期待値', topics: [], tags: [] })).toEqual(['binom-mean']);
    expect(filterFormulas(items, { query: '二項 分散', topics: [], tags: [] })).toEqual([]);
  });
  it('分野・タグ（いずれかに一致）で絞り込む', () => {
    expect(filterFormulas(items, { query: '', topics: ['regression'], tags: [] })).toEqual(['ols']);
    expect(filterFormulas(items, { query: '', topics: [], tags: ['分散', '推定量'] })).toEqual(['pois-var', 'ols']);
    expect(filterFormulas(items, { query: '', topics: ['discrete'], tags: ['推定量'] })).toEqual([]);
  });
});
