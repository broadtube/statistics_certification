import { err, ok, type Result } from '../result';
import { SCHEMA_VERSION, type AttemptEvent, type FlashcardEvent, type LearningRecord, type MockResult } from '../types/record';

export const APP_ID = 'stats-pre1-study-app';

export interface ExportFile {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: string;
  record: LearningRecord;
}

export type DecodeError =
  | { kind: 'not-json' }
  | { kind: 'wrong-app' }
  | { kind: 'unsupported-version'; version: number }
  | { kind: 'schema-mismatch'; path: string; message: string };

class Mismatch extends Error {
  constructor(readonly path: string, message: string) {
    super(message);
  }
}

type Obj = Record<string, unknown>;

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Mismatch(path, 'オブジェクトではありません');
  return v as Obj;
}
function str(o: Obj, k: string, path: string): string {
  if (typeof o[k] !== 'string') throw new Mismatch(`${path}.${k}`, '文字列ではありません');
  return o[k];
}
function num(o: Obj, k: string, path: string): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Mismatch(`${path}.${k}`, '数値ではありません');
  return v;
}
function bool(o: Obj, k: string, path: string): boolean {
  if (typeof o[k] !== 'boolean') throw new Mismatch(`${path}.${k}`, '真偽値ではありません');
  return o[k];
}
function oneOf<T extends string>(o: Obj, k: string, path: string, values: readonly T[]): T {
  const v = o[k];
  if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) {
    throw new Mismatch(`${path}.${k}`, `${values.join(' / ')} のいずれかではありません`);
  }
  return v as T;
}
function arr<T>(o: Obj, k: string, path: string, item: (v: unknown, p: string) => T): T[] {
  const v = o[k];
  if (!Array.isArray(v)) throw new Mismatch(`${path}.${k}`, '配列ではありません');
  return v.map((x, i) => item(x, `${path}.${k}[${i}]`));
}
function numRecord(v: unknown, path: string): Record<string, number> {
  const o = obj(v, path);
  const out: Record<string, number> = {};
  for (const k of Object.keys(o)) out[k] = num(o, k, path);
  return out;
}

function attempt(v: unknown, p: string): AttemptEvent {
  const o = obj(v, p);
  const a: AttemptEvent = {
    id: str(o, 'id', p),
    problemId: str(o, 'problemId', p),
    variantIndex: num(o, 'variantIndex', p),
    answeredAt: str(o, 'answeredAt', p),
    correct: bool(o, 'correct', p),
    answer: str(o, 'answer', p),
    durationMs: num(o, 'durationMs', p),
    context: oneOf(o, 'context', p, ['practice', 'review', 'mock'] as const),
  };
  if (o.mockId !== undefined) a.mockId = str(o, 'mockId', p);
  return a;
}

function flashcard(v: unknown, p: string): FlashcardEvent {
  const o = obj(v, p);
  return {
    id: str(o, 'id', p),
    formulaId: str(o, 'formulaId', p),
    rating: oneOf(o, 'rating', p, ['known', 'unsure'] as const),
    ratedAt: str(o, 'ratedAt', p),
  };
}

function mockResult(v: unknown, p: string): MockResult {
  const o = obj(v, p);
  const c = obj(o.config, `${p}.config`);
  const by = obj(o.byCategory, `${p}.byCategory`);
  const byCategory: MockResult['byCategory'] = {};
  for (const k of Object.keys(by)) {
    const e = obj(by[k], `${p}.byCategory.${k}`);
    byCategory[k] = { correct: num(e, 'correct', `${p}.byCategory.${k}`), total: num(e, 'total', `${p}.byCategory.${k}`) };
  }
  return {
    id: str(o, 'id', p),
    startedAt: str(o, 'startedAt', p),
    submittedAt: str(o, 'submittedAt', p),
    reason: oneOf(o, 'reason', p, ['submitted', 'timeout'] as const),
    config: {
      questionCount: num(c, 'questionCount', `${p}.config`),
      timeLimitMinutes: num(c, 'timeLimitMinutes', `${p}.config`),
      categoryWeights: numRecord(c.categoryWeights, `${p}.config.categoryWeights`),
    },
    score: num(o, 'score', p),
    correct: num(o, 'correct', p),
    total: num(o, 'total', p),
    byCategory,
  };
}

function parseRecord(v: unknown, path: string): LearningRecord {
  const o = obj(v, path);
  return {
    schemaVersion: SCHEMA_VERSION,
    attempts: arr(o, 'attempts', path, attempt),
    flashcards: arr(o, 'flashcards', path, flashcard),
    mockResults: arr(o, 'mockResults', path, mockResult),
  };
}

function versionOf(v: unknown): number | undefined {
  if (typeof v === 'object' && v !== null && 'schemaVersion' in v) {
    const s = (v as Obj).schemaVersion;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

/**
 * 保存データを現行形式へ移行して検証する。
 * schemaVersion を上げるときは、旧バージョンからの変換をここに追加する。
 */
export function migrateRecord(raw: unknown, path = 'record'): Result<LearningRecord, DecodeError> {
  const version = versionOf(raw);
  if (version === undefined) return err({ kind: 'schema-mismatch', path: `${path}.schemaVersion`, message: 'バージョン情報がありません' });
  if (version !== SCHEMA_VERSION) return err({ kind: 'unsupported-version', version });
  try {
    return ok(parseRecord(raw, path));
  } catch (e) {
    if (e instanceof Mismatch) return err({ kind: 'schema-mismatch', path: e.path, message: e.message });
    throw e;
  }
}

export function encodeRecord(record: LearningRecord, now: Date): ExportFile {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), record };
}

export function decodeRecord(text: string): Result<LearningRecord, DecodeError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err({ kind: 'not-json' });
  }
  if (typeof raw !== 'object' || raw === null || (raw as Obj).app !== APP_ID) return err({ kind: 'wrong-app' });
  const file = raw as Obj;
  if (typeof file.schemaVersion === 'number' && file.schemaVersion !== SCHEMA_VERSION) {
    return err({ kind: 'unsupported-version', version: file.schemaVersion });
  }
  return migrateRecord(file.record, 'record');
}

function unionBy<T extends { id: string }>(a: readonly T[], b: readonly T[], key: (x: T) => string): T[] {
  const map = new Map<string, T>();
  for (const x of [...a, ...b]) if (!map.has(x.id)) map.set(x.id, x);
  return [...map.values()].sort((x, y) => {
    const tx = Date.parse(key(x));
    const ty = Date.parse(key(y));
    return tx - ty || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);
  });
}

/** イベントIDの和集合を取り、時刻順に整列する（冪等・交換可能） */
export function mergeRecords(a: LearningRecord, b: LearningRecord): LearningRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    attempts: unionBy(a.attempts, b.attempts, (x) => x.answeredAt),
    flashcards: unionBy(a.flashcards, b.flashcards, (x) => x.ratedAt),
    mockResults: unionBy(a.mockResults, b.mockResults, (x) => x.submittedAt),
  };
}

export function describeDecodeError(e: DecodeError): string {
  switch (e.kind) {
    case 'not-json':
      return 'JSON として読み込めませんでした。エクスポートしたファイルを選んでください。';
    case 'wrong-app':
      return 'このアプリの学習記録ファイルではありません。';
    case 'unsupported-version':
      return `対応していない形式のバージョンです（${e.version}）。アプリを最新にしてから読み込んでください。`;
    case 'schema-mismatch':
      return `ファイルの内容が学習記録の形式と一致しません（${e.path}: ${e.message}）。`;
  }
}
