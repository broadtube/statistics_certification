import { shuffle, type Rng } from '../random';
import type { FlashcardEvent, FlashcardRating } from '../types/record';

export interface FlashcardState {
  rating: FlashcardRating;
  ratedAt: string;
}

/** 評価履歴から公式ごとの最新評価を導出する */
export function deriveFlashcardStates(events: readonly FlashcardEvent[]): Map<string, FlashcardState> {
  const out = new Map<string, FlashcardState>();
  for (const e of events) {
    const prev = out.get(e.formulaId);
    if (!prev || Date.parse(e.ratedAt) >= Date.parse(prev.ratedAt)) out.set(e.formulaId, { rating: e.rating, ratedAt: e.ratedAt });
  }
  return out;
}

/** 「あいまい」→ 未評価 → 「覚えた」（評価が古い順）に並べる（要件4.4） */
export function orderFlashcards(formulaIds: readonly string[], states: ReadonlyMap<string, FlashcardState>, rng: Rng): string[] {
  const unsure = formulaIds.filter((id) => states.get(id)?.rating === 'unsure');
  const fresh = formulaIds.filter((id) => !states.has(id));
  const known = formulaIds
    .filter((id) => states.get(id)?.rating === 'known')
    .sort((a, b) => Date.parse(states.get(a)?.ratedAt ?? '') - Date.parse(states.get(b)?.ratedAt ?? ''));
  return [...shuffle(unsure, rng), ...shuffle(fresh, rng), ...known];
}

export function summarizeRatings(ratings: readonly FlashcardRating[]): { known: number; unsure: number } {
  return { known: ratings.filter((r) => r === 'known').length, unsure: ratings.filter((r) => r === 'unsure').length };
}
