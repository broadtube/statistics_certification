import { emptyRecord, type AttemptEvent, type FlashcardEvent, type LearningRecord, type MockResult } from '../types/record';
import { mergeRecords, migrateRecord } from './codec';

export const RECORD_KEY = 'stats-pre1:record';

export type StorageStatus = 'available' | 'unavailable' | 'quota-exceeded';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface RecordStore {
  readonly status: StorageStatus;
  /** 起動時に破損データを退避した場合 true */
  readonly recoveredFromCorruption: boolean;
  load(): LearningRecord;
  appendAttempts(events: readonly AttemptEvent[]): void;
  appendFlashcard(event: FlashcardEvent): void;
  appendMockResult(result: MockResult): void;
  replace(record: LearningRecord): void;
  clear(): void;
  subscribe(listener: (record: LearningRecord) => void): () => void;
  /** 別タブでの変更（storage イベント）を反映する */
  handleExternalChange(key: string | null): void;
}

function isQuotaError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

/**
 * 学習記録をブラウザ内ストレージへ保存する（要件11.1, 11.2, 11.7）。
 * @param getStorage ストレージの取得（アクセス自体が例外になる環境があるため関数で受け取る）
 */
export function createRecordStore(getStorage: () => StorageLike | null, now: () => Date = () => new Date()): RecordStore {
  let storage: StorageLike | null = null;
  let status: StorageStatus = 'available';
  let recoveredFromCorruption = false;
  try {
    storage = getStorage();
    if (!storage) status = 'unavailable';
    else {
      // プライベートモード等で書き込みだけ失敗する環境を検出する
      storage.setItem(`${RECORD_KEY}.probe`, '1');
      storage.removeItem(`${RECORD_KEY}.probe`);
    }
  } catch (e) {
    status = isQuotaError(e) ? 'quota-exceeded' : 'unavailable';
    if (status === 'unavailable') storage = null;
  }

  const listeners = new Set<(r: LearningRecord) => void>();

  /** 保存済みの記録を読む。破損していれば退避して空の記録を返す */
  function readStored(): LearningRecord | null {
    if (!storage) return null;
    let text: string | null;
    try {
      text = storage.getItem(RECORD_KEY);
    } catch {
      return null;
    }
    if (text === null) return emptyRecord();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = undefined;
    }
    const r = raw === undefined ? null : migrateRecord(raw);
    if (r?.ok) return r.value;
    try {
      storage.setItem(`${RECORD_KEY}.corrupt-${now().toISOString()}`, text);
      storage.removeItem(RECORD_KEY);
    } catch {
      /* 退避できなくても起動は継続する */
    }
    recoveredFromCorruption = true;
    return emptyRecord();
  }

  let current: LearningRecord = readStored() ?? emptyRecord();

  const notify = () => {
    for (const l of listeners) l(current);
  };

  function write(record: LearningRecord): void {
    current = record;
    if (storage) {
      try {
        storage.setItem(RECORD_KEY, JSON.stringify(record));
        if (status === 'quota-exceeded') status = 'available';
      } catch (e) {
        status = isQuotaError(e) ? 'quota-exceeded' : 'unavailable';
      }
    }
    notify();
  }

  /** 書き込み直前に最新の保存値と統合してから追記する（別タブの追記を失わない） */
  function append(patch: Partial<Omit<LearningRecord, 'schemaVersion'>>): void {
    const latest = readStored();
    const base = latest ? mergeRecords(latest, current) : current;
    write(mergeRecords(base, { schemaVersion: 1, attempts: [], flashcards: [], mockResults: [], ...patch }));
  }

  return {
    get status() {
      return status;
    },
    get recoveredFromCorruption() {
      return recoveredFromCorruption;
    },
    load: () => current,
    appendAttempts: (events) => append({ attempts: [...events] }),
    appendFlashcard: (event) => append({ flashcards: [event] }),
    appendMockResult: (result) => append({ mockResults: [result] }),
    replace: (record) => write(record),
    clear: () => {
      current = emptyRecord();
      try {
        storage?.removeItem(RECORD_KEY);
      } catch {
        /* noop */
      }
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    handleExternalChange(key) {
      if (key !== null && key !== RECORD_KEY) return;
      const latest = readStored();
      if (latest) current = latest;
      notify();
    },
  };
}

let singleton: RecordStore | undefined;

const SSR_STORAGE: StorageLike = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

/** ブラウザ用の共有インスタンス（storage イベントで別タブの変更を反映する） */
export function getRecordStore(): RecordStore {
  // ビルド時（サーバー側の描画）はブラウザのストレージがないため、空の記録を持つ一時的なストアを返す
  if (typeof window === 'undefined') return createRecordStore(() => SSR_STORAGE);
  if (!singleton) {
    singleton = createRecordStore(() => (typeof window === 'undefined' ? null : window.localStorage));
    if (typeof window !== 'undefined') {
      const store = singleton;
      window.addEventListener('storage', (e) => store.handleExternalChange(e.key));
    }
  }
  return singleton;
}
