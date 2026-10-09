import { computeTopicStats } from '../domain/stats';
import { getRecordStore } from '../storage/record-store';
import { loadProblemIndex } from './data';

/** [data-topic-accuracy="分野ID"] の要素に、解答履歴がある分野の正答率を表示する（要件1.4） */
export async function fillTopicAccuracy(root: ParentNode = document): Promise<void> {
  const targets = [...root.querySelectorAll<HTMLElement>('[data-topic-accuracy]')];
  if (targets.length === 0) return;
  const record = getRecordStore().load();
  if (record.attempts.length === 0) return;
  const index = await loadProblemIndex();
  const stats = computeTopicStats(record.attempts, index.problems);
  for (const el of targets) {
    const s = stats.get(el.dataset.topicAccuracy ?? '');
    if (!s || s.accuracy === null) continue;
    const pct = Math.round(s.accuracy * 100);
    el.textContent = `正答率 ${pct}%（${s.attempts}回）`;
    el.className = `badge ${pct >= 80 ? 'ok' : pct < 60 ? 'ng' : 'warn'}`;
    el.hidden = false;
  }
}
