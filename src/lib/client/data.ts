import type { Problem, ProblemBankFile, ProblemIndexFile } from '../types/problem';
import { url } from '../url';

let indexPromise: Promise<ProblemIndexFile> | undefined;
const bankPromises = new Map<string, Promise<ProblemBankFile>>();

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`${path} の取得に失敗しました（HTTP ${res.status}）`);
  return (await res.json()) as T;
}

/** 問題索引（ID・分野・大分類・形式のみ） */
export function loadProblemIndex(): Promise<ProblemIndexFile> {
  indexPromise ??= fetchJson<ProblemIndexFile>('data/problems/index.json').catch((e: unknown) => {
    indexPromise = undefined;
    throw e;
  });
  return indexPromise;
}

/** 分野別の問題バンク。contentVersion をクエリに付けてキャッシュを制御する */
export function loadBank(topicId: string, contentVersion: string): Promise<ProblemBankFile> {
  const key = `${topicId}@${contentVersion}`;
  let p = bankPromises.get(key);
  if (!p) {
    p = fetchJson<ProblemBankFile>(`data/problems/${topicId}.json?v=${contentVersion}`).catch((e: unknown) => {
      bankPromises.delete(key);
      throw e;
    });
    bankPromises.set(key, p);
  }
  return p;
}

/** 指定した問題を、必要な分野の問題バンクだけ取得して返す */
export async function loadProblems(ids: readonly string[]): Promise<Map<string, Problem>> {
  const index = await loadProblemIndex();
  const byId = new Map(index.problems.map((e) => [e.id, e]));
  const banks = [...new Set(ids.map((id) => byId.get(id)?.bank).filter((b): b is string => !!b))];
  const files = await Promise.all(banks.map((b) => loadBank(b, index.contentVersion)));
  const out = new Map<string, Problem>();
  for (const f of files) for (const p of f.problems) if (ids.includes(p.id)) out.set(p.id, p);
  return out;
}
