import { describe, expect, it } from 'vitest';
import { parsePracticeQuery, summarizeSession } from '../../src/lib/domain/session';

describe('演習セッションの結果', () => {
  it('正答数・正答率・分野別内訳・誤答一覧を集計する', () => {
    const s = summarizeSession(
      [
        { problemId: 'p1', correct: true },
        { problemId: 'p2', correct: false },
        { problemId: 'p3', correct: false },
        { problemId: 'p1', correct: true },
      ],
      new Map([['p1', ['reg']], ['p2', ['reg', 'anova']], ['p3', ['ts']]]),
    );
    expect(s.total).toBe(4);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBe(0.5);
    expect(s.byTopic).toEqual([
      { topicId: 'reg', correct: 2, total: 3 },
      { topicId: 'anova', correct: 0, total: 1 },
      { topicId: 'ts', correct: 0, total: 1 },
    ]);
    expect(s.wrongProblemIds).toEqual(['p2', 'p3']);
  });
  it('空のセッション', () => {
    expect(summarizeSession([], new Map())).toEqual({ total: 0, correct: 0, accuracy: null, byTopic: [], wrongProblemIds: [] });
  });
});

describe('演習ページのクエリ', () => {
  it('分野・問題・ランダムの指定を解釈する', () => {
    expect(parsePracticeQuery('?topic=reg')).toEqual({ kind: 'topic', topicIds: ['reg'], count: 10 });
    expect(parsePracticeQuery('?topic=reg,ts&count=5')).toEqual({ kind: 'topic', topicIds: ['reg', 'ts'], count: 5 });
    expect(parsePracticeQuery('?problem=p1')).toEqual({ kind: 'single', problemId: 'p1' });
    expect(parsePracticeQuery('?problems=p1,p2')).toEqual({ kind: 'list', problemIds: ['p1', 'p2'] });
    expect(parsePracticeQuery('?mode=random&count=20')).toEqual({ kind: 'random', topicIds: 'all', count: 20 });
    expect(parsePracticeQuery('')).toBeNull();
  });
  it('問題数は1〜50に丸める', () => {
    expect(parsePracticeQuery('?mode=random&count=999')).toEqual({ kind: 'random', topicIds: 'all', count: 50 });
    expect(parsePracticeQuery('?mode=random&count=abc')).toEqual({ kind: 'random', topicIds: 'all', count: 10 });
  });
});
