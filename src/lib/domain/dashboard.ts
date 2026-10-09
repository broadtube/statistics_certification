import type { ProblemIndexEntry } from '../types/problem';
import type { LearningRecord, MockResult } from '../types/record';
import { deriveReviewSchedule, dueItems, nextDueDate } from './srs';
import { computeTopicStats, detectWeakTopics, knownAttempts, overallStats, type TopicStats } from './stats';

export interface DashboardSummary {
  empty: boolean;
  overall: { attempts: number; correct: number; accuracy: number | null };
  dueToday: number;
  nextDue: string | null;
  topicStats: TopicStats[];
  weakTopics: string[];
  /** 直近の模試（古い順、最大10件） */
  recentMocks: MockResult[];
}

export function summarizeDashboard(record: LearningRecord, index: readonly ProblemIndexEntry[], now: Date): DashboardSummary {
  const known = knownAttempts(record.attempts, index);
  const stats = computeTopicStats(known, index);
  const schedule = deriveReviewSchedule(known);
  const mocks = [...record.mockResults].sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt));
  return {
    empty: record.attempts.length === 0 && record.flashcards.length === 0 && record.mockResults.length === 0,
    overall: overallStats(known, index),
    dueToday: dueItems(schedule, now).length,
    nextDue: nextDueDate(schedule, now),
    topicStats: [...stats.values()],
    weakTopics: detectWeakTopics(stats),
    recentMocks: mocks.slice(-10),
  };
}
