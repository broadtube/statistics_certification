import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOCK_CONFIGS,
  MOCK_SESSION_KEY,
  createMockSession,
  createMockSessionStore,
  remainingMs,
  scoreMock,
  type MockSession,
} from '../../src/lib/domain/mock';
import type { Problem } from '../../src/lib/types/problem';

const problem = (id: string, category: string, type: 'numeric' | 'choice' = 'numeric'): Problem => ({
  id, topics: [`${category}-t`], category, formulas: [], difficulty: 1, type,
  statementHtml: '', explanationHtml: '',
  choices: type === 'choice' ? [{ id: 'a', html: 'A', correct: true }, { id: 'b', html: 'B', correct: false }] : null,
  shuffleChoices: false, digits: 0, tolerance: null, variants: [{ values: {}, answer: 10 }], sourceLabel: '', topicLinks: [], formulaLinks: [],
});

const config = { questionCount: 3, timeLimitMinutes: 10, categoryWeights: { A: 1, B: 1 } };
const t0 = new Date('2026-10-09T10:00:00+09:00');

function session(): MockSession {
  return createMockSession(config, [
    { problemId: 'p1', variantIndex: 0 },
    { problemId: 'p2', variantIndex: 0 },
    { problemId: 'p3', variantIndex: 0 },
  ], { p2: ['b', 'a'] }, t0, 'mock-1');
}

describe('模試の既定設定', () => {
  it('本番形式は30問・120分', () => {
    expect(DEFAULT_MOCK_CONFIGS.full).toMatchObject({ questionCount: 30, timeLimitMinutes: 120 });
    expect(DEFAULT_MOCK_CONFIGS.mini.questionCount).toBeLessThan(30);
  });
});

describe('模試の進行状態', () => {
  it('開始時に出題・選択肢の並び・終了時刻を確定する', () => {
    const s = session();
    expect(s.endsAt).toBe('2026-10-09T01:10:00.000Z');
    expect(s.choiceOrders).toEqual({ p2: ['b', 'a'] });
    expect(s.answers).toEqual({});
    expect(s.marked).toEqual([]);
  });

  it('残り時間は終了時刻（絶対時刻）から算出する', () => {
    const s = session();
    expect(remainingMs(s, new Date('2026-10-09T10:03:00+09:00'))).toBe(7 * 60_000);
    expect(remainingMs(s, new Date('2026-10-09T10:30:00+09:00'))).toBe(0);
  });
});

describe('採点', () => {
  const problems = new Map([['p1', problem('p1', 'A')], ['p2', problem('p2', 'B', 'choice')], ['p3', problem('p3', 'B')]]);

  it('得点・正答率・大分類別成績を算出し、解答した問題を記録用イベントにする', () => {
    const s = { ...session(), answers: { 0: { kind: 'numeric' as const, raw: '10' }, 1: { kind: 'choice' as const, choiceId: 'b' } }, durations: { 0: 1000, 1: 2000 } };
    const r = scoreMock(s, problems, 'submitted', new Date('2026-10-09T10:05:00+09:00'), () => 'id');
    expect(r.result).toMatchObject({ id: 'mock-1', reason: 'submitted', correct: 1, total: 3, score: 33, byCategory: { A: { correct: 1, total: 1 }, B: { correct: 0, total: 2 } } });
    expect(r.attempts).toHaveLength(2);
    expect(r.attempts[0]).toMatchObject({ problemId: 'p1', correct: true, context: 'mock', mockId: 'mock-1', durationMs: 1000 });
    expect(r.items.map((i) => i.status)).toEqual(['correct', 'wrong', 'unanswered']);
  });

  it('数値として解釈できない解答は不正解', () => {
    const s = { ...session(), answers: { 0: { kind: 'numeric' as const, raw: 'abc' } } };
    const r = scoreMock(s, problems, 'timeout', new Date(), () => 'id');
    expect(r.items[0]?.status).toBe('wrong');
  });

  it('コンテンツ更新で消えた問題は採点対象から除き、注記用に返す', () => {
    const r = scoreMock(session(), new Map([['p1', problem('p1', 'A')]]), 'timeout', new Date(), () => 'id');
    expect(r.result.total).toBe(1);
    expect(r.removedProblemIds).toEqual(['p2', 'p3']);
    expect(r.items.map((i) => i.status)).toEqual(['unanswered', 'removed', 'removed']);
  });
});

describe('進行状態の保存', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };

  it('保存・復元・破棄', () => {
    const s = memory();
    const store = createMockSessionStore(() => s);
    store.save(session());
    expect(s.m.has(MOCK_SESSION_KEY)).toBe(true);
    expect(createMockSessionStore(() => s).load()).toEqual(session());
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('壊れたデータは無視する', () => {
    const s = memory();
    s.setItem(MOCK_SESSION_KEY, '{"id": 1}');
    expect(createMockSessionStore(() => s).load()).toBeNull();
  });
});
