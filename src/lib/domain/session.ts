export interface SessionResult {
  problemId: string;
  correct: boolean;
}

export interface SessionSummary {
  total: number;
  correct: number;
  accuracy: number | null;
  byTopic: { topicId: string; correct: number; total: number }[];
  /** 誤答した問題（重複なし・出題順） */
  wrongProblemIds: string[];
}

/** セッションの正答数・正答率・分野別内訳・誤答一覧（要件6.10） */
export function summarizeSession(results: readonly SessionResult[], topicsOf: ReadonlyMap<string, readonly string[]>): SessionSummary {
  const byTopic = new Map<string, { topicId: string; correct: number; total: number }>();
  const wrong: string[] = [];
  let correct = 0;
  for (const r of results) {
    if (r.correct) correct++;
    else if (!wrong.includes(r.problemId)) wrong.push(r.problemId);
    for (const t of topicsOf.get(r.problemId) ?? []) {
      const s = byTopic.get(t) ?? { topicId: t, correct: 0, total: 0 };
      s.total++;
      if (r.correct) s.correct++;
      byTopic.set(t, s);
    }
  }
  return {
    total: results.length,
    correct,
    accuracy: results.length === 0 ? null : correct / results.length,
    byTopic: [...byTopic.values()],
    wrongProblemIds: wrong,
  };
}

export type PracticeRequest =
  | { kind: 'topic'; topicIds: string[]; count: number }
  | { kind: 'random'; topicIds: 'all'; count: number }
  | { kind: 'single'; problemId: string }
  | { kind: 'list'; problemIds: string[] };

export const DEFAULT_COUNT = 10;
export const MAX_COUNT = 50;

function parseCount(v: string | null): number {
  const n = Number(v);
  if (v === null || !Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(1, Math.round(n)));
}

const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

/** 演習ページのクエリ（?topic= / ?problem= / ?problems= / ?mode=random）を解釈する */
export function parsePracticeQuery(search: string): PracticeRequest | null {
  const q = new URLSearchParams(search);
  const problem = q.get('problem');
  if (problem) return { kind: 'single', problemId: problem };
  const problems = q.get('problems');
  if (problems) return { kind: 'list', problemIds: list(problems) };
  const topic = q.get('topic');
  if (topic) return { kind: 'topic', topicIds: list(topic), count: parseCount(q.get('count')) };
  if (q.get('mode') === 'random') return { kind: 'random', topicIds: 'all', count: parseCount(q.get('count')) };
  return null;
}
