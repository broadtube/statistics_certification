import { describe, expect, it } from 'vitest';
import { WEAK_TOPIC_CRITERIA, computeTopicStats, detectWeakTopics, knownAttempts, overallStats } from '../../src/lib/domain/stats';
import type { ProblemIndexEntry } from '../../src/lib/types/problem';
import type { AttemptEvent } from '../../src/lib/types/record';

const entry = (id: string, topics: string[]): ProblemIndexEntry => ({
  id, topics, category: 'c', type: 'numeric', difficulty: 1, bank: topics[0] ?? '', variantCount: 1,
});
const index = [entry('p1', ['reg']), entry('p2', ['reg', 'anova']), entry('p3', ['ts'])];

let n = 0;
const at = (problemId: string, correct: boolean): AttemptEvent => ({
  id: `a${n++}`, problemId, variantIndex: 0, answeredAt: '2026-10-01T00:00:00Z', correct, answer: '', durationMs: 0, context: 'practice',
});

describe('集計', () => {
  it('全体の解答数と正答率', () => {
    expect(overallStats([at('p1', true), at('p1', false), at('p3', true), at('p3', true)], index)).toEqual({ attempts: 4, correct: 3, accuracy: 0.75 });
    expect(overallStats([], index)).toEqual({ attempts: 0, correct: 0, accuracy: null });
  });

  it('分野ごとに集計し、複数分野に属する問題は各分野に計上する', () => {
    const s = computeTopicStats([at('p1', true), at('p2', false), at('p3', true)], index);
    expect(s.get('reg')).toEqual({ topicId: 'reg', attempts: 2, correct: 1, accuracy: 0.5 });
    expect(s.get('anova')).toEqual({ topicId: 'anova', attempts: 1, correct: 0, accuracy: 0 });
    expect(s.get('ts')).toEqual({ topicId: 'ts', attempts: 1, correct: 1, accuracy: 1 });
  });

  it('現在のコンテンツに存在しない問題の記録は除外する', () => {
    const attempts = [at('p1', true), at('deleted', false)];
    expect(knownAttempts(attempts, index).map((a) => a.problemId)).toEqual(['p1']);
    expect(overallStats(attempts, index).attempts).toBe(1);
    expect(computeTopicStats(attempts, index).size).toBe(1);
  });
});

describe('弱点判定', () => {
  it('既定は解答数10以上・正答率60%未満', () => {
    expect(WEAK_TOPIC_CRITERIA).toEqual({ minAttempts: 10, maxAccuracy: 0.6 });
  });

  it('基準を満たす分野を正答率の低い順に返す', () => {
    const stats = new Map([
      ['a', { topicId: 'a', attempts: 10, correct: 5, accuracy: 0.5 }],
      ['b', { topicId: 'b', attempts: 20, correct: 4, accuracy: 0.2 }],
      ['c', { topicId: 'c', attempts: 9, correct: 0, accuracy: 0 }], // 解答数不足
      ['d', { topicId: 'd', attempts: 10, correct: 6, accuracy: 0.6 }], // ちょうど60%は弱点ではない
    ]);
    expect(detectWeakTopics(stats)).toEqual(['b', 'a']);
  });
});
