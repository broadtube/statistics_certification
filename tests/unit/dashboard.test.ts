import { describe, expect, it } from 'vitest';
import { summarizeDashboard } from '../../src/lib/domain/dashboard';
import type { ProblemIndexEntry } from '../../src/lib/types/problem';
import { emptyRecord, type AttemptEvent, type LearningRecord, type MockResult } from '../../src/lib/types/record';

const entry = (id: string, topic: string): ProblemIndexEntry => ({ id, topics: [topic], category: 'c', type: 'numeric', difficulty: 1, bank: topic, variantCount: 1 });
const index = [entry('a', 'reg'), entry('b', 'ts')];
let n = 0;
const at = (problemId: string, correct: boolean, iso: string): AttemptEvent => ({
  id: `x${n++}`, problemId, variantIndex: 0, answeredAt: iso, correct, answer: '', durationMs: 0, context: 'practice',
});
const mock = (id: string, submittedAt: string, score: number): MockResult => ({
  id, startedAt: submittedAt, submittedAt, reason: 'submitted', config: { questionCount: 1, timeLimitMinutes: 1, categoryWeights: {} }, score, correct: 0, total: 1, byCategory: {},
});

describe('ダッシュボードの集計', () => {
  it('学習記録が空なら empty', () => {
    expect(summarizeDashboard(emptyRecord(), index, new Date()).empty).toBe(true);
  });

  it('総解答数・全体正答率・当日の要復習数・弱点分野・模試の推移', () => {
    const attempts = [
      ...Array.from({ length: 10 }, (_, i) => at('a', i < 3, '2026-10-01T10:00:00+09:00')),
      at('b', true, '2026-10-01T10:00:00+09:00'),
    ];
    const record: LearningRecord = {
      ...emptyRecord(),
      attempts,
      mockResults: Array.from({ length: 12 }, (_, i) => mock(`m${i}`, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00+09:00`, i * 5)),
    };
    const s = summarizeDashboard(record, index, new Date('2026-10-03T09:00:00+09:00'));
    expect(s.empty).toBe(false);
    expect(s.overall).toEqual({ attempts: 11, correct: 4, accuracy: 4 / 11 });
    expect(s.dueToday).toBe(1);
    expect(s.weakTopics).toEqual(['reg']);
    expect(s.topicStats.map((t) => t.topicId)).toEqual(['reg', 'ts']);
    expect(s.recentMocks).toHaveLength(10);
    expect(s.recentMocks[0]?.id).toBe('m2');
    expect(s.recentMocks[9]?.id).toBe('m11');
  });
});
