import { describe, expect, it } from 'vitest';
import { APP_ID, decodeRecord, encodeRecord, mergeRecords, migrateRecord } from '../../src/lib/storage/codec';
import { emptyRecord, type AttemptEvent, type LearningRecord } from '../../src/lib/types/record';

const attempt = (id: string, at: string, over: Partial<AttemptEvent> = {}): AttemptEvent => ({
  id, problemId: 'p1', variantIndex: 0, answeredAt: at, correct: true, answer: 'a', durationMs: 1000, context: 'practice', ...over,
});

function recordA(): LearningRecord {
  return {
    ...emptyRecord(),
    attempts: [attempt('a1', '2026-10-01T10:00:00+09:00'), attempt('a2', '2026-10-02T10:00:00+09:00')],
    flashcards: [{ id: 'f1', formulaId: 'x', rating: 'known', ratedAt: '2026-10-01T09:00:00+09:00' }],
  };
}

function recordB(): LearningRecord {
  return {
    ...emptyRecord(),
    attempts: [attempt('b1', '2026-10-01T12:00:00+09:00'), attempt('a2', '2026-10-02T10:00:00+09:00')],
    mockResults: [{
      id: 'm1', startedAt: '2026-10-03T10:00:00+09:00', submittedAt: '2026-10-03T12:00:00+09:00', reason: 'timeout',
      config: { questionCount: 30, timeLimitMinutes: 120, categoryWeights: { a: 1 } }, score: 60, correct: 18, total: 30,
      byCategory: { a: { correct: 18, total: 30 } },
    }],
  };
}

describe('エクスポート形式', () => {
  it('バージョン情報付きで出力し、読み込むと元に戻る', () => {
    const file = encodeRecord(recordA(), new Date('2026-10-09T00:00:00Z'));
    expect(file).toMatchObject({ app: APP_ID, schemaVersion: 1, exportedAt: '2026-10-09T00:00:00.000Z' });
    const back = decodeRecord(JSON.stringify(file));
    expect(back).toEqual({ ok: true, value: recordA() });
  });
});

describe('読込時の検証', () => {
  it('JSONでなければ not-json', () => {
    expect(decodeRecord('{oops')).toEqual({ ok: false, error: { kind: 'not-json' } });
  });
  it('別アプリのファイルなら wrong-app', () => {
    expect(decodeRecord(JSON.stringify({ app: 'other', schemaVersion: 1, record: emptyRecord() }))).toEqual({ ok: false, error: { kind: 'wrong-app' } });
  });
  it('未対応のバージョンなら unsupported-version', () => {
    const text = JSON.stringify({ app: APP_ID, schemaVersion: 99, exportedAt: '', record: { ...emptyRecord(), schemaVersion: 99 } });
    expect(decodeRecord(text)).toEqual({ ok: false, error: { kind: 'unsupported-version', version: 99 } });
  });
  it('形式が違えば問題箇所付きで schema-mismatch', () => {
    const bad = { ...recordA(), attempts: [{ ...attempt('a1', 'x'), correct: 'yes' }] };
    const r = decodeRecord(JSON.stringify({ app: APP_ID, schemaVersion: 1, exportedAt: '', record: bad }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'schema-mismatch', path: 'record.attempts[0].correct' } });
  });
  it('イベント配列の欠落も検出する', () => {
    const r = decodeRecord(JSON.stringify({ app: APP_ID, schemaVersion: 1, exportedAt: '', record: { schemaVersion: 1, attempts: [] } }));
    expect(r).toMatchObject({ ok: false, error: { kind: 'schema-mismatch', path: 'record.flashcards' } });
  });
});

describe('統合', () => {
  it('イベントIDの和集合を時刻順に並べる', () => {
    const m = mergeRecords(recordA(), recordB());
    expect(m.attempts.map((a) => a.id)).toEqual(['a1', 'b1', 'a2']);
    expect(m.flashcards).toHaveLength(1);
    expect(m.mockResults).toHaveLength(1);
  });
  it('冪等: merge(a, a) = a', () => {
    expect(mergeRecords(recordA(), recordA())).toEqual(mergeRecords(recordA(), emptyRecord()));
  });
  it('交換可能: merge(a, b) = merge(b, a)', () => {
    expect(mergeRecords(recordA(), recordB())).toEqual(mergeRecords(recordB(), recordA()));
  });
});

describe('移行', () => {
  it('現行バージョンの保存データはそのまま受け入れる', () => {
    expect(migrateRecord(recordA())).toEqual({ ok: true, value: recordA() });
  });
  it('未知の形式は拒否する', () => {
    expect(migrateRecord('text').ok).toBe(false);
    expect(migrateRecord({ schemaVersion: 2 })).toEqual({ ok: false, error: { kind: 'unsupported-version', version: 2 } });
  });
});
