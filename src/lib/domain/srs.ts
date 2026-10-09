import type { AttemptEvent } from '../types/record';

export interface SrsConfig {
  /** Box0〜Box3 の次回復習までの日数 */
  intervalsDays: readonly [number, number, number, number];
  /** このボックスで正答すると復習対象から外す */
  graduateAfterBox: 0 | 1 | 2 | 3;
}

export const SRS_CONFIG: SrsConfig = { intervalsDays: [1, 3, 7, 14], graduateAfterBox: 3 };

export type Box = 0 | 1 | 2 | 3;

export type ReviewState =
  | { status: 'graduated'; graduatedAt: string }
  | { status: 'scheduled'; box: Box; dueDate: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** ローカルタイムゾーンの暦日（YYYY-MM-DD） */
export function localDate(t: string | Date): string {
  const d = typeof t === 'string' ? new Date(t) : t;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
}

/**
 * 解答履歴を時刻順に再生して復習スケジュールを導出する（要件9.1–9.4）。
 * - 誤答: Box0 に登録（再誤答・卒業後の誤答も Box0 へ）
 * - 期日以降の正答: 次のボックスへ昇格。最終ボックスで正答すると卒業
 * - 期日前の正答・未登録問題の正答: 変化なし
 */
export function deriveReviewSchedule(attempts: readonly AttemptEvent[], config: SrsConfig = SRS_CONFIG): Map<string, ReviewState> {
  const sorted = [...attempts].sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
  const states = new Map<string, ReviewState>();
  for (const a of sorted) {
    const day = localDate(a.answeredAt);
    const s = states.get(a.problemId);
    if (!a.correct) {
      states.set(a.problemId, { status: 'scheduled', box: 0, dueDate: addDays(day, config.intervalsDays[0]) });
      continue;
    }
    if (!s || s.status !== 'scheduled' || day < s.dueDate) continue;
    if (s.box >= config.graduateAfterBox) {
      states.set(a.problemId, { status: 'graduated', graduatedAt: a.answeredAt });
    } else {
      const box = (s.box + 1) as Box;
      states.set(a.problemId, { status: 'scheduled', box, dueDate: addDays(day, config.intervalsDays[box]) });
    }
  }
  return states;
}

export interface DueItem {
  problemId: string;
  dueDate: string;
}

/** 期日が当日以前の問題を、期日の古い順に返す（要件9.5） */
export function dueItems(schedule: ReadonlyMap<string, ReviewState>, asOf: Date): DueItem[] {
  const today = localDate(asOf);
  const out: DueItem[] = [];
  for (const [problemId, s] of schedule) {
    if (s.status === 'scheduled' && s.dueDate <= today) out.push({ problemId, dueDate: s.dueDate });
  }
  return out.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.problemId.localeCompare(b.problemId)));
}

/** 当日より後で最も近い復習予定日（要件9.6） */
export function nextDueDate(schedule: ReadonlyMap<string, ReviewState>, asOf: Date): string | null {
  const today = localDate(asOf);
  let next: string | null = null;
  for (const s of schedule.values()) {
    if (s.status === 'scheduled' && s.dueDate > today && (next === null || s.dueDate < next)) next = s.dueDate;
  }
  return next;
}
