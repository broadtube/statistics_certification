import { shuffle, type Rng } from '../random';
import type { ProblemIndexEntry } from '../types/problem';
import type { AttemptEvent, MockConfig } from '../types/record';
import { deriveReviewSchedule, dueItems } from './srs';
import { knownAttempts } from './stats';

export type SessionMode =
  | { kind: 'topic'; topicIds: string[]; count: number }
  | { kind: 'random'; topicIds: string[] | 'all'; count: number }
  | { kind: 'single'; problemId: string }
  | { kind: 'review'; asOf: Date }
  | { kind: 'mock'; config: MockConfig };

export interface SessionItem {
  problemId: string;
  variantIndex: number;
}

/** 最大剰余法で total を重みに比例配分する */
export function allocateByWeight(total: number, weights: Readonly<Record<string, number>>): Record<string, number> {
  const keys = Object.keys(weights);
  const sum = keys.reduce((s, k) => s + Math.max(0, weights[k] ?? 0), 0);
  const out: Record<string, number> = {};
  if (sum <= 0) {
    for (const k of keys) out[k] = 0;
    return out;
  }
  const quotas = keys.map((k) => ({ k, q: (total * Math.max(0, weights[k] ?? 0)) / sum }));
  let assigned = 0;
  for (const { k, q } of quotas) {
    out[k] = Math.floor(q);
    assigned += Math.floor(q);
  }
  const byRemainder = [...quotas].sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)) || keys.indexOf(a.k) - keys.indexOf(b.k));
  for (let i = 0; assigned < total && i < byRemainder.length; i++, assigned++) {
    const k = byRemainder[i]?.k ?? '';
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function lastVariantOf(attempts: readonly AttemptEvent[]): Map<string, number> {
  const latest = new Map<string, { t: number; v: number }>();
  for (const a of attempts) {
    const t = Date.parse(a.answeredAt);
    const prev = latest.get(a.problemId);
    if (!prev || t >= prev.t) latest.set(a.problemId, { t, v: a.variantIndex });
  }
  return new Map([...latest].map(([k, x]) => [k, x.v]));
}

function pickVariant(entry: ProblemIndexEntry, last: number | undefined, rng: Rng): number {
  if (entry.variantCount <= 1) return 0;
  if (last === undefined || last >= entry.variantCount) return rng.int(0, entry.variantCount - 1);
  const v = rng.int(0, entry.variantCount - 2);
  return v >= last ? v + 1 : v;
}

/** 未解答を優先し、それぞれの群の中は無作為に並べる */
function prioritizeUnanswered(entries: readonly ProblemIndexEntry[], answered: ReadonlySet<string>, rng: Rng): ProblemIndexEntry[] {
  const fresh = entries.filter((e) => !answered.has(e.id));
  const seen = entries.filter((e) => answered.has(e.id));
  return [...shuffle(fresh, rng), ...shuffle(seen, rng)];
}

/** 出題計画を作る（要件6.1, 6.2, 8.1, 9.5, 11.8） */
export function planSession(
  mode: SessionMode,
  index: readonly ProblemIndexEntry[],
  attempts: readonly AttemptEvent[],
  rng: Rng,
): SessionItem[] {
  const known = knownAttempts(attempts, index);
  const byId = new Map(index.map((e) => [e.id, e]));
  const lastVariant = lastVariantOf(known);
  const answered = new Set(known.map((a) => a.problemId));
  const toItems = (entries: readonly ProblemIndexEntry[]): SessionItem[] =>
    entries.map((e) => ({ problemId: e.id, variantIndex: pickVariant(e, lastVariant.get(e.id), rng) }));

  switch (mode.kind) {
    case 'single': {
      const e = byId.get(mode.problemId);
      return e ? toItems([e]) : [];
    }
    case 'topic':
    case 'random': {
      const topics = mode.topicIds === 'all' ? null : new Set(mode.topicIds);
      const candidates = index.filter((e) => topics === null || e.topics.some((t) => topics.has(t)));
      return toItems(prioritizeUnanswered(candidates, answered, rng).slice(0, Math.max(0, mode.count)));
    }
    case 'review': {
      const due = dueItems(deriveReviewSchedule(known), mode.asOf);
      return toItems(due.map((d) => byId.get(d.problemId)).filter((e): e is ProblemIndexEntry => e !== undefined));
    }
    case 'mock': {
      const { questionCount, categoryWeights } = mode.config;
      const pools = new Map<string, ProblemIndexEntry[]>();
      for (const e of index) pools.set(e.category, [...(pools.get(e.category) ?? []), e]);
      const weights: Record<string, number> = {};
      for (const c of pools.keys()) weights[c] = categoryWeights[c] ?? 0;
      const quota = allocateByWeight(Math.min(questionCount, index.length), weights);

      const picked: ProblemIndexEntry[] = [];
      const rest: ProblemIndexEntry[] = [];
      for (const [c, pool] of pools) {
        const ordered = prioritizeUnanswered(pool, answered, rng);
        const n = Math.min(quota[c] ?? 0, ordered.length);
        picked.push(...ordered.slice(0, n));
        rest.push(...ordered.slice(n));
      }
      // 割当に満たない分は、残りの問題（重みの大きい大分類を優先）から補う
      const fill = shuffle(rest, rng).sort((a, b) => (categoryWeights[b.category] ?? 0) - (categoryWeights[a.category] ?? 0));
      picked.push(...fill.slice(0, Math.max(0, Math.min(questionCount, index.length) - picked.length)));
      return toItems(shuffle(picked, rng));
    }
  }
}
