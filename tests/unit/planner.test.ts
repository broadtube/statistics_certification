import { describe, expect, it } from 'vitest';
import { allocateByWeight, planSession } from '../../src/lib/domain/planner';
import { createRng } from '../../src/lib/random';
import type { ProblemIndexEntry } from '../../src/lib/types/problem';
import type { AttemptEvent } from '../../src/lib/types/record';

const entry = (id: string, topic: string, category: string, variantCount = 1): ProblemIndexEntry => ({
  id, topics: [topic], category, type: 'numeric', difficulty: 1, bank: topic, variantCount,
});

const index: ProblemIndexEntry[] = [
  entry('r1', 'reg', 'A'), entry('r2', 'reg', 'A'), entry('r3', 'reg', 'A'),
  entry('t1', 'ts', 'B'), entry('t2', 'ts', 'B'),
  entry('m1', 'mv', 'C', 5),
];

let n = 0;
const at = (problemId: string, correct: boolean, iso = '2026-10-01T10:00:00+09:00', variantIndex = 0): AttemptEvent => ({
  id: `a${n++}`, problemId, variantIndex, answeredAt: iso, correct, answer: '', durationMs: 0, context: 'practice',
});

describe('最大剰余法による配分', () => {
  it('重みに比例して配分し、合計を一致させる', () => {
    expect(allocateByWeight(10, { A: 1, B: 1, C: 1 })).toEqual({ A: 4, B: 3, C: 3 });
    expect(allocateByWeight(5, { A: 3, B: 1 })).toEqual({ A: 4, B: 1 });
    expect(allocateByWeight(3, { A: 0, B: 1 })).toEqual({ A: 0, B: 3 });
  });
});

describe('分野別・ランダム演習', () => {
  it('対象分野から重複なく指定数を抽出する', () => {
    const items = planSession({ kind: 'topic', topicIds: ['reg'], count: 2 }, index, [], createRng(1));
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.problemId)).size).toBe(2);
    expect(items.every((i) => i.problemId.startsWith('r'))).toBe(true);
  });

  it('対象数が不足する場合は全問を出題する', () => {
    const items = planSession({ kind: 'topic', topicIds: ['ts'], count: 10 }, index, [], createRng(1));
    expect(items.map((i) => i.problemId).sort()).toEqual(['t1', 't2']);
  });

  it('未解答の問題を優先する', () => {
    const attempts = [at('r1', true), at('r2', false)];
    for (let seed = 0; seed < 10; seed++) {
      const items = planSession({ kind: 'topic', topicIds: ['reg'], count: 1 }, index, attempts, createRng(seed));
      expect(items[0]?.problemId).toBe('r3');
    }
  });

  it('ランダム演習は全分野から抽出できる', () => {
    const items = planSession({ kind: 'random', topicIds: 'all', count: 6 }, index, [], createRng(2));
    expect(items.map((i) => i.problemId).sort()).toEqual(index.map((e) => e.id).sort());
  });

  it('単一問題の指定', () => {
    expect(planSession({ kind: 'single', problemId: 't2' }, index, [], createRng(1))).toEqual([{ problemId: 't2', variantIndex: 0 }]);
    expect(planSession({ kind: 'single', problemId: 'nope' }, index, [], createRng(1))).toEqual([]);
  });
});

describe('類題の選択', () => {
  it('直近に使った類題を避ける', () => {
    const attempts = [at('m1', true, '2026-10-01T10:00:00+09:00', 3)];
    for (let seed = 0; seed < 30; seed++) {
      const [item] = planSession({ kind: 'single', problemId: 'm1' }, index, attempts, createRng(seed));
      expect(item?.variantIndex).not.toBe(3);
      expect(item?.variantIndex).toBeGreaterThanOrEqual(0);
      expect(item?.variantIndex).toBeLessThan(5);
    }
  });
});

describe('復習', () => {
  it('当日の要復習問題を期日の古い順に並べ、存在しない問題は除外する', () => {
    const attempts = [
      at('t1', false, '2026-10-03T10:00:00+09:00'),
      at('r2', false, '2026-10-01T10:00:00+09:00'),
      at('deleted', false, '2026-09-01T10:00:00+09:00'),
    ];
    const items = planSession({ kind: 'review', asOf: new Date('2026-10-05T09:00:00+09:00') }, index, attempts, createRng(1));
    expect(items.map((i) => i.problemId)).toEqual(['r2', 't1']);
  });
});

describe('模試', () => {
  it('大分類の重みに比例して問題数を割り当てる', () => {
    const big = [
      ...Array.from({ length: 10 }, (_, i) => entry(`a${i}`, 'x', 'A')),
      ...Array.from({ length: 10 }, (_, i) => entry(`b${i}`, 'y', 'B')),
    ];
    const items = planSession({ kind: 'mock', config: { questionCount: 6, timeLimitMinutes: 10, categoryWeights: { A: 2, B: 1 } } }, big, [], createRng(5));
    expect(items).toHaveLength(6);
    expect(items.filter((i) => i.problemId.startsWith('a'))).toHaveLength(4);
  });

  it('不足分は他の大分類から補う', () => {
    const items = planSession({ kind: 'mock', config: { questionCount: 5, timeLimitMinutes: 10, categoryWeights: { A: 1, B: 1, C: 10 } } }, index, [], createRng(3));
    expect(items).toHaveLength(5);
    expect(new Set(items.map((i) => i.problemId)).size).toBe(5);
    expect(items.map((i) => i.problemId)).toContain('m1');
  });

  it('重みのない大分類の問題も、問題数が足りなければ使う', () => {
    const items = planSession({ kind: 'mock', config: { questionCount: 6, timeLimitMinutes: 10, categoryWeights: { A: 1 } } }, index, [], createRng(3));
    expect(items).toHaveLength(6);
  });
});
