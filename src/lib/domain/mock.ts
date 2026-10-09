import type { StorageLike } from '../storage/record-store';
import type { Problem } from '../types/problem';
import type { AttemptEvent, MockConfig, MockResult } from '../types/record';
import { gradeAnswer, type UserAnswer } from './grader';
import type { SessionItem } from './planner';

export const MOCK_SESSION_KEY = 'stats-pre1:mock-session';

/**
 * 模試の既定設定。本番形式は準1級CBT（25〜30問・120分）に合わせる。
 * categoryWeights は実行時に大分類の mockWeight で上書きする。
 */
export const DEFAULT_MOCK_CONFIGS = {
  full: { questionCount: 30, timeLimitMinutes: 120, categoryWeights: {} },
  mini: { questionCount: 10, timeLimitMinutes: 40, categoryWeights: {} },
} as const satisfies Record<string, MockConfig>;

export interface MockSession {
  id: string;
  config: MockConfig;
  startedAt: string;
  endsAt: string;
  items: SessionItem[];
  /** 問題ID → 選択肢の表示順（再読み込み後も同じ順に表示する） */
  choiceOrders: Record<string, string[]>;
  /** 出題順のインデックス → 解答 */
  answers: Record<number, UserAnswer>;
  marked: number[];
  currentIndex: number;
  /** 出題順のインデックス → その問題に費やした時間（ミリ秒） */
  durations: Record<number, number>;
}

export function createMockSession(config: MockConfig, items: SessionItem[], choiceOrders: Record<string, string[]>, now: Date, id: string): MockSession {
  return {
    id,
    config,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + config.timeLimitMinutes * 60_000).toISOString(),
    items,
    choiceOrders,
    answers: {},
    marked: [],
    currentIndex: 0,
    durations: {},
  };
}

/** 残り時間。終了時刻（絶対時刻）から算出するため、再読み込みやタブを閉じていた時間も経過に含まれる */
export function remainingMs(session: Pick<MockSession, 'endsAt'>, now: Date): number {
  return Math.max(0, Date.parse(session.endsAt) - now.getTime());
}

export type ItemStatus = 'correct' | 'wrong' | 'unanswered' | 'removed';

export interface MockScore {
  result: MockResult;
  attempts: AttemptEvent[];
  items: { index: number; problemId: string; status: ItemStatus }[];
  /** コンテンツ更新で存在しなくなった問題 */
  removedProblemIds: string[];
}

/** 模試を採点する（要件8.5, 8.6）。未解答は不正解として数え、解答した問題のみ学習記録のイベントにする */
export function scoreMock(
  session: MockSession,
  problems: ReadonlyMap<string, Problem>,
  reason: MockResult['reason'],
  now: Date,
  newId: () => string,
): MockScore {
  const items: MockScore['items'] = [];
  const attempts: AttemptEvent[] = [];
  const byCategory: MockResult['byCategory'] = {};
  const removed: string[] = [];
  let correct = 0;
  let total = 0;

  session.items.forEach((item, index) => {
    const problem = problems.get(item.problemId);
    if (!problem) {
      removed.push(item.problemId);
      items.push({ index, problemId: item.problemId, status: 'removed' });
      return;
    }
    total++;
    const cat = (byCategory[problem.category] ??= { correct: 0, total: 0 });
    cat.total++;
    const answer = session.answers[index];
    if (!answer || (answer.kind === 'numeric' && answer.raw.trim() === '')) {
      items.push({ index, problemId: item.problemId, status: 'unanswered' });
      return;
    }
    const g = gradeAnswer(problem, item.variantIndex, answer);
    const ok = g.status === 'graded' && g.correct;
    if (ok) {
      correct++;
      cat.correct++;
    }
    items.push({ index, problemId: item.problemId, status: ok ? 'correct' : 'wrong' });
    attempts.push({
      id: newId(),
      problemId: item.problemId,
      variantIndex: item.variantIndex,
      answeredAt: now.toISOString(),
      correct: ok,
      answer: g.status === 'graded' ? g.normalizedAnswer : answer.kind === 'numeric' ? answer.raw : answer.choiceId,
      durationMs: Math.round(session.durations[index] ?? 0),
      context: 'mock',
      mockId: session.id,
    });
  });

  return {
    result: {
      id: session.id,
      startedAt: session.startedAt,
      submittedAt: now.toISOString(),
      reason,
      config: session.config,
      score: total === 0 ? 0 : Math.round((100 * correct) / total),
      correct,
      total,
      byCategory,
    },
    attempts,
    items,
    removedProblemIds: removed,
  };
}

function isSession(v: unknown): v is MockSession {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.startedAt === 'string' &&
    typeof s.endsAt === 'string' &&
    Array.isArray(s.items) &&
    typeof s.answers === 'object' &&
    Array.isArray(s.marked) &&
    typeof s.currentIndex === 'number' &&
    typeof s.config === 'object' &&
    typeof s.choiceOrders === 'object' &&
    typeof s.durations === 'object'
  );
}

export interface MockSessionStore {
  load(): MockSession | null;
  save(session: MockSession): void;
  clear(): void;
}

/** 進行中の模試の保存（学習記録のエクスポート対象外） */
export function createMockSessionStore(getStorage: () => StorageLike | null): MockSessionStore {
  const storage = (() => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  })();
  let memory: MockSession | null = null;
  return {
    load() {
      if (!storage) return memory;
      try {
        const text = storage.getItem(MOCK_SESSION_KEY);
        if (!text) return null;
        const v: unknown = JSON.parse(text);
        return isSession(v) ? v : null;
      } catch {
        return null;
      }
    },
    save(session) {
      memory = session;
      try {
        storage?.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
      } catch {
        /* 保存できなくてもメモリ上で継続する */
      }
    },
    clear() {
      memory = null;
      try {
        storage?.removeItem(MOCK_SESSION_KEY);
      } catch {
        /* noop */
      }
    },
  };
}
