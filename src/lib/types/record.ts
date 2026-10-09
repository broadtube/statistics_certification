/** 学習記録（ブラウザ内に保存するイベントログ）。状態はすべてイベントから導出する */

export type AttemptContext = 'practice' | 'review' | 'mock';

export interface AttemptEvent {
  id: string;
  problemId: string;
  variantIndex: number;
  /** ISO 8601（タイムゾーン付き） */
  answeredAt: string;
  correct: boolean;
  /** 選択肢ID、または正規化済みの数値文字列 */
  answer: string;
  durationMs: number;
  context: AttemptContext;
  mockId?: string;
}

export type FlashcardRating = 'known' | 'unsure';

export interface FlashcardEvent {
  id: string;
  formulaId: string;
  rating: FlashcardRating;
  ratedAt: string;
}

export interface MockConfig {
  questionCount: number;
  timeLimitMinutes: number;
  /** 大分類ID → 重み */
  categoryWeights: Record<string, number>;
}

export interface MockResult {
  id: string;
  startedAt: string;
  submittedAt: string;
  reason: 'submitted' | 'timeout';
  config: MockConfig;
  /** 100点満点換算 */
  score: number;
  correct: number;
  total: number;
  byCategory: Record<string, { correct: number; total: number }>;
}

export const SCHEMA_VERSION = 1 as const;

export interface LearningRecord {
  schemaVersion: typeof SCHEMA_VERSION;
  attempts: AttemptEvent[];
  flashcards: FlashcardEvent[];
  mockResults: MockResult[];
}

export function emptyRecord(): LearningRecord {
  return { schemaVersion: SCHEMA_VERSION, attempts: [], flashcards: [], mockResults: [] };
}
