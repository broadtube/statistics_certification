import { useEffect, useState } from 'preact/hooks';
import { getRecordStore, type RecordStore } from '../storage/record-store';
import type { LearningRecord } from '../types/record';

/** 学習記録を購読する（別タブでの更新も反映される） */
export function useRecord(): { record: LearningRecord; store: RecordStore } {
  const store = getRecordStore();
  const [record, setRecord] = useState<LearningRecord>(() => store.load());
  useEffect(() => store.subscribe(setRecord), [store]);
  return { record, store };
}
