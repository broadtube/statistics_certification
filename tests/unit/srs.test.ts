import { describe, expect, it } from 'vitest';
import { SRS_CONFIG, addDays, deriveReviewSchedule, dueItems, localDate, nextDueDate } from '../../src/lib/domain/srs';
import type { AttemptEvent } from '../../src/lib/types/record';

let seq = 0;
const at = (problemId: string, iso: string, correct: boolean): AttemptEvent => ({
  id: `e${seq++}`, problemId, variantIndex: 0, answeredAt: iso, correct, answer: '', durationMs: 0, context: 'practice',
});

describe('日付の扱い（ローカル暦日）', () => {
  it('ローカルタイムゾーンの暦日に変換する', () => {
    expect(localDate('2026-10-01T23:59:00+09:00')).toBe('2026-10-01');
    expect(localDate('2026-10-01T15:00:00Z')).toBe('2026-10-02'); // JST 0:00
    expect(localDate(new Date(2026, 9, 1, 0, 0))).toBe('2026-10-01');
  });
  it('日数を加算する（月末・年末をまたぐ）', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
  });
});

describe('復習スケジュール', () => {
  it('既定の間隔は 1, 3, 7, 14 日、Box3 で正答すると卒業', () => {
    expect(SRS_CONFIG).toEqual({ intervalsDays: [1, 3, 7, 14], graduateAfterBox: 3 });
  });

  it('一度も誤答していない問題は現れない', () => {
    const s = deriveReviewSchedule([at('p', '2026-10-01T10:00:00+09:00', true)]);
    expect(s.size).toBe(0);
  });

  it('誤答で Box0（翌日）に登録する', () => {
    const s = deriveReviewSchedule([at('p', '2026-10-01T10:00:00+09:00', false)]);
    expect(s.get('p')).toEqual({ status: 'scheduled', box: 0, dueDate: '2026-10-02' });
  });

  it('期日以降の正答で昇格し、間隔が延びる', () => {
    const s = deriveReviewSchedule([
      at('p', '2026-10-01T10:00:00+09:00', false),
      at('p', '2026-10-02T09:00:00+09:00', true),
      at('p', '2026-10-05T09:00:00+09:00', true),
    ]);
    expect(s.get('p')).toEqual({ status: 'scheduled', box: 2, dueDate: '2026-10-12' });
  });

  it('期日前の正答では状態を変えない', () => {
    const s = deriveReviewSchedule([
      at('p', '2026-10-01T10:00:00+09:00', false),
      at('p', '2026-10-01T10:05:00+09:00', true),
    ]);
    expect(s.get('p')).toEqual({ status: 'scheduled', box: 0, dueDate: '2026-10-02' });
  });

  it('再誤答で最短間隔に戻す', () => {
    const s = deriveReviewSchedule([
      at('p', '2026-10-01T10:00:00+09:00', false),
      at('p', '2026-10-02T10:00:00+09:00', true),
      at('p', '2026-10-04T10:00:00+09:00', false),
    ]);
    expect(s.get('p')).toEqual({ status: 'scheduled', box: 0, dueDate: '2026-10-05' });
  });

  it('Box3 で正答すると卒業し、卒業後の誤答で再登録する', () => {
    const events = [
      at('p', '2026-10-01T10:00:00+09:00', false),
      at('p', '2026-10-02T10:00:00+09:00', true), // → Box1 (10/05)
      at('p', '2026-10-05T10:00:00+09:00', true), // → Box2 (10/12)
      at('p', '2026-10-12T10:00:00+09:00', true), // → Box3 (10/26)
      at('p', '2026-10-26T10:00:00+09:00', true), // → 卒業
    ];
    expect(deriveReviewSchedule(events).get('p')).toEqual({ status: 'graduated', graduatedAt: '2026-10-26T10:00:00+09:00' });
    const again = deriveReviewSchedule([...events, at('p', '2026-11-01T10:00:00+09:00', false)]);
    expect(again.get('p')).toEqual({ status: 'scheduled', box: 0, dueDate: '2026-11-02' });
  });

  it('記録の順序に依存しない（時刻順に再生する）', () => {
    const a = at('p', '2026-10-01T10:00:00+09:00', false);
    const b = at('p', '2026-10-02T10:00:00+09:00', true);
    expect(deriveReviewSchedule([b, a])).toEqual(deriveReviewSchedule([a, b]));
  });
});

describe('要復習の抽出', () => {
  const schedule = deriveReviewSchedule([
    at('old', '2026-09-28T10:00:00+09:00', false), // due 9/29
    at('new', '2026-10-01T10:00:00+09:00', false), // due 10/2
    at('future', '2026-10-05T10:00:00+09:00', false), // due 10/6
  ]);

  it('期日が当日以前の問題を期日の古い順に返す', () => {
    expect(dueItems(schedule, new Date('2026-10-02T08:00:00+09:00'))).toEqual([
      { problemId: 'old', dueDate: '2026-09-29' },
      { problemId: 'new', dueDate: '2026-10-02' },
    ]);
  });

  it('ローカル日付の境界: 23:59 と 0:00', () => {
    expect(dueItems(schedule, new Date('2026-10-05T23:59:00+09:00')).map((d) => d.problemId)).not.toContain('future');
    expect(dueItems(schedule, new Date('2026-10-06T00:00:00+09:00')).map((d) => d.problemId)).toContain('future');
  });

  it('次回の復習予定日を返す（なければ null）', () => {
    expect(nextDueDate(schedule, new Date('2026-10-02T08:00:00+09:00'))).toBe('2026-10-06');
    expect(nextDueDate(schedule, new Date('2026-10-07T08:00:00+09:00'))).toBeNull();
  });
});
