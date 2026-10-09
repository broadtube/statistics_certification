import { describe, expect, it } from 'vitest';
import { deriveFlashcardStates, orderFlashcards, summarizeRatings } from '../../src/lib/domain/flashcards';
import { createRng } from '../../src/lib/random';
import type { FlashcardEvent } from '../../src/lib/types/record';

const ev = (id: string, formulaId: string, rating: 'known' | 'unsure', ratedAt: string): FlashcardEvent => ({ id, formulaId, rating, ratedAt });

describe('暗記カード', () => {
  const events = [
    ev('1', 'a', 'unsure', '2026-10-01T00:00:00Z'),
    ev('2', 'a', 'known', '2026-10-02T00:00:00Z'),
    ev('3', 'b', 'known', '2026-10-03T00:00:00Z'),
    ev('4', 'c', 'unsure', '2026-10-01T00:00:00Z'),
    ev('5', 'e', 'known', '2026-09-01T00:00:00Z'),
  ];

  it('公式ごとの最新評価を導出する（記録順に依存しない）', () => {
    const s = deriveFlashcardStates([...events].reverse());
    expect(s.get('a')).toEqual({ rating: 'known', ratedAt: '2026-10-02T00:00:00Z' });
    expect(s.get('c')?.rating).toBe('unsure');
  });

  it('あいまい → 未評価 → 覚えた（評価が古い順）の順に並べる', () => {
    const order = orderFlashcards(['a', 'b', 'c', 'd', 'e'], deriveFlashcardStates(events), createRng(1));
    expect(order[0]).toBe('c');
    expect(order[1]).toBe('d');
    expect(order.slice(2)).toEqual(['e', 'a', 'b']);
  });

  it('各群の中は無作為に並べる', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `u${i}`);
    const a = orderFlashcards(ids, new Map(), createRng(1));
    const b = orderFlashcards(ids, new Map(), createRng(2));
    expect([...a].sort()).toEqual([...ids].sort());
    expect(a).not.toEqual(b);
  });

  it('一巡後の件数を集計する', () => {
    expect(summarizeRatings(['known', 'unsure', 'known'])).toEqual({ known: 2, unsure: 1 });
  });
});
