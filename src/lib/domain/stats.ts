import type { ProblemIndexEntry } from '../types/problem';
import type { AttemptEvent } from '../types/record';

export interface TopicStats {
  topicId: string;
  attempts: number;
  correct: number;
  /** attempts = 0 のとき null */
  accuracy: number | null;
}

export interface WeakTopicCriteria {
  minAttempts: number;
  /** この値未満を弱点とする */
  maxAccuracy: number;
}

export const WEAK_TOPIC_CRITERIA: WeakTopicCriteria = { minAttempts: 10, maxAccuracy: 0.6 };

type Index = readonly Pick<ProblemIndexEntry, 'id' | 'topics'>[];

/** 現在のコンテンツに存在する問題の記録だけを残す（要件11.8） */
export function knownAttempts(attempts: readonly AttemptEvent[], index: Index): AttemptEvent[] {
  const ids = new Set(index.map((p) => p.id));
  return attempts.filter((a) => ids.has(a.problemId));
}

export function overallStats(attempts: readonly AttemptEvent[], index: Index): { attempts: number; correct: number; accuracy: number | null } {
  const known = knownAttempts(attempts, index);
  const correct = known.filter((a) => a.correct).length;
  return { attempts: known.length, correct, accuracy: known.length === 0 ? null : correct / known.length };
}

export function computeTopicStats(attempts: readonly AttemptEvent[], index: Index): Map<string, TopicStats> {
  const topicsOf = new Map(index.map((p) => [p.id, p.topics]));
  const out = new Map<string, TopicStats>();
  for (const a of attempts) {
    for (const t of topicsOf.get(a.problemId) ?? []) {
      const s = out.get(t) ?? { topicId: t, attempts: 0, correct: 0, accuracy: null };
      s.attempts++;
      if (a.correct) s.correct++;
      s.accuracy = s.correct / s.attempts;
      out.set(t, s);
    }
  }
  return out;
}

/** 解答数が基準以上かつ正答率が基準未満の分野を、正答率の低い順に返す（要件10.3） */
export function detectWeakTopics(stats: ReadonlyMap<string, TopicStats>, criteria: WeakTopicCriteria = WEAK_TOPIC_CRITERIA): string[] {
  return [...stats.values()]
    .filter((s) => s.attempts >= criteria.minAttempts && s.accuracy !== null && s.accuracy < criteria.maxAccuracy)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0) || a.topicId.localeCompare(b.topicId))
    .map((s) => s.topicId);
}
