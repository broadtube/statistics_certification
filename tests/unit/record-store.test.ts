import { describe, expect, it, vi } from 'vitest';
import { RECORD_KEY, createRecordStore, type StorageLike } from '../../src/lib/storage/record-store';
import { emptyRecord, type AttemptEvent } from '../../src/lib/types/record';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  quota = Number.POSITIVE_INFINITY;
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) {
    if (v.length > this.quota) {
      const e = new Error('quota');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.map.set(k, v);
  }
  removeItem(k: string) { this.map.delete(k); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

const attempt = (id: string, at = '2026-10-01T10:00:00+09:00'): AttemptEvent => ({
  id, problemId: 'p1', variantIndex: 0, answeredAt: at, correct: false, answer: '1', durationMs: 5, context: 'practice',
});

describe('学習記録ストア', () => {
  it('追記ごとに保存し、再訪時に読み込む', () => {
    const s = new MemoryStorage();
    const a = createRecordStore(() => s);
    a.appendAttempts([attempt('x1')]);
    a.appendFlashcard({ id: 'f1', formulaId: 'f', rating: 'unsure', ratedAt: '2026-10-01T00:00:00Z' });
    const b = createRecordStore(() => s);
    expect(b.status).toBe('available');
    expect(b.load().attempts.map((x) => x.id)).toEqual(['x1']);
    expect(b.load().flashcards).toHaveLength(1);
  });

  it('保存データがなければ空の記録を返す', () => {
    expect(createRecordStore(() => new MemoryStorage()).load()).toEqual(emptyRecord());
  });

  it('ストレージが使えなければメモリ上で継続し、状態を通知する', () => {
    const store = createRecordStore(() => {
      throw new Error('SecurityError');
    });
    expect(store.status).toBe('unavailable');
    store.appendAttempts([attempt('m1')]);
    expect(store.load().attempts).toHaveLength(1);
  });

  it('容量超過を検知して状態を変える（記録はメモリ上に保持）', () => {
    const s = new MemoryStorage();
    const store = createRecordStore(() => s);
    const listener = vi.fn();
    store.subscribe(listener);
    s.quota = 10;
    store.appendAttempts([attempt('q1')]);
    expect(store.status).toBe('quota-exceeded');
    expect(store.load().attempts).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
  });

  it('別タブの追記を失わない（書き込み直前に最新値と統合する）', () => {
    const s = new MemoryStorage();
    const tabA = createRecordStore(() => s);
    const tabB = createRecordStore(() => s);
    tabA.appendAttempts([attempt('a1', '2026-10-01T10:00:00Z')]);
    tabB.appendAttempts([attempt('b1', '2026-10-01T11:00:00Z')]);
    tabA.appendAttempts([attempt('a2', '2026-10-01T12:00:00Z')]);
    expect(createRecordStore(() => s).load().attempts.map((x) => x.id)).toEqual(['a1', 'b1', 'a2']);
  });

  it('外部での変更を検知したら再読込して購読者に通知する', () => {
    const s = new MemoryStorage();
    const tabA = createRecordStore(() => s);
    const tabB = createRecordStore(() => s);
    const listener = vi.fn();
    tabA.subscribe(listener);
    tabB.appendAttempts([attempt('b1')]);
    tabA.handleExternalChange(RECORD_KEY);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ attempts: [expect.objectContaining({ id: 'b1' })] }));
    expect(tabA.load().attempts).toHaveLength(1);
  });

  it('関係のないキーの変更は無視する', () => {
    const s = new MemoryStorage();
    const store = createRecordStore(() => s);
    const listener = vi.fn();
    store.subscribe(listener);
    store.handleExternalChange('other-key');
    expect(listener).not.toHaveBeenCalled();
  });

  it('破損データは退避して空の記録で起動し、その旨を伝える', () => {
    const s = new MemoryStorage();
    s.setItem(RECORD_KEY, '{broken');
    const store = createRecordStore(() => s, () => new Date('2026-10-09T01:02:03Z'));
    expect(store.load()).toEqual(emptyRecord());
    expect(store.recoveredFromCorruption).toBe(true);
    expect(s.getItem(`${RECORD_KEY}.corrupt-2026-10-09T01:02:03.000Z`)).toBe('{broken');
    expect(s.getItem(RECORD_KEY)).toBeNull();
  });

  it('置換と全消去', () => {
    const s = new MemoryStorage();
    const store = createRecordStore(() => s);
    store.appendAttempts([attempt('a1')]);
    store.replace({ ...emptyRecord(), attempts: [attempt('r1')] });
    expect(createRecordStore(() => s).load().attempts.map((x) => x.id)).toEqual(['r1']);
    store.clear();
    expect(createRecordStore(() => s).load()).toEqual(emptyRecord());
  });

  it('購読解除後は通知しない', () => {
    const store = createRecordStore(() => new MemoryStorage());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.appendAttempts([attempt('z')]);
    expect(listener).not.toHaveBeenCalled();
  });
});
