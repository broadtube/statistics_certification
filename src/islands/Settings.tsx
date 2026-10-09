import IslandBoundary from '../components/IslandBoundary';
import { useState } from 'preact/hooks';
import { useRecord } from '../lib/client/use-record';
import { createMockSessionStore } from '../lib/domain/mock';
import { decodeRecord, describeDecodeError, encodeRecord, mergeRecords } from '../lib/storage/codec';
import type { LearningRecord } from '../lib/types/record';

type Message = { kind: 'ok' | 'ng' | 'info'; text: string } | null;

const counts = (r: LearningRecord) => `解答 ${r.attempts.length} 件・暗記カード評価 ${r.flashcards.length} 件・模試 ${r.mockResults.length} 回`;

/** 学習記録のエクスポート・インポート・全消去（要件11.3–11.6） */
function SettingsInner() {
  const { record, store } = useRecord();
  const [pending, setPending] = useState<{ name: string; record: LearningRecord } | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const exportRecord = () => {
    const now = new Date();
    const blob = new Blob([JSON.stringify(encodeRecord(store.load(), now), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.href = URL.createObjectURL(blob);
    a.download = `stats-pre1-record-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage({ kind: 'ok', text: '学習記録をエクスポートしました。' });
  };

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const r = decodeRecord(await file.text());
    if (!r.ok) {
      setPending(null);
      setMessage({ kind: 'ng', text: `読み込めませんでした。${describeDecodeError(r.error)} 現在の学習記録は変更していません。` });
      return;
    }
    setPending({ name: file.name, record: r.value });
    setMessage(null);
  };

  const apply = (how: 'replace' | 'merge') => {
    if (!pending) return;
    const next = how === 'replace' ? pending.record : mergeRecords(store.load(), pending.record);
    store.replace(next);
    setPending(null);
    setMessage({ kind: 'ok', text: `${how === 'replace' ? '置き換えました' : '統合しました'}（${counts(next)}）。` });
  };

  const clearAll = () => {
    if (!window.confirm('学習記録をすべて消去します。この操作は取り消せません。よろしいですか？')) return;
    store.clear();
    createMockSessionStore(() => window.localStorage).clear();
    setPending(null);
    setMessage({ kind: 'info', text: '学習記録を消去しました。' });
  };

  return (
    <div class="stack">
      {message && <div class={`alert ${message.kind}`} role={message.kind === 'ng' ? 'alert' : 'status'}>{message.text}</div>}

      <section class="card stack" aria-labelledby="current">
        <h2 id="current" class="setup-title">現在の学習記録</h2>
        <p>{counts(record)}</p>
        {store.status !== 'available' && <p class="alert warn">このブラウザでは学習記録を保存できない状態です。エクスポートして保管してください。</p>}
      </section>

      <section class="card stack" aria-labelledby="export">
        <h2 id="export" class="setup-title">エクスポート</h2>
        <p class="small muted">学習記録をJSONファイルとして保存します。別の端末やブラウザでインポートすると、学習を引き継げます。</p>
        <p><button type="button" class="btn primary" onClick={exportRecord}>JSONファイルをダウンロード</button></p>
      </section>

      <section class="card stack" aria-labelledby="import">
        <h2 id="import" class="setup-title">インポート</h2>
        <p class="small muted">エクスポートしたファイルを読み込みます。読み込み後に「置き換え」か「統合」を選べます。</p>
        <label class="btn file-btn">
          ファイルを選ぶ
          <input type="file" accept="application/json,.json" onChange={(e) => void onFile(e)} class="sr-only" />
        </label>
        {pending && (
          <div class="alert info stack">
            <p><strong>{pending.name}</strong>：{counts(pending.record)}</p>
            <p class="row">
              <button type="button" class="btn primary" onClick={() => apply('merge')}>統合する（重複は除く）</button>
              <button type="button" class="btn" onClick={() => apply('replace')}>現在の記録を置き換える</button>
              <button type="button" class="btn" onClick={() => setPending(null)}>キャンセル</button>
            </p>
          </div>
        )}
      </section>

      <section class="card stack" aria-labelledby="danger">
        <h2 id="danger" class="setup-title">全消去</h2>
        <p class="small muted">このブラウザに保存されている学習記録（解答履歴・暗記カードの評価・模試結果・進行中の模試）をすべて消去します。</p>
        <p><button type="button" class="btn danger" onClick={clearAll}>学習記録をすべて消去</button></p>
      </section>
    </div>
  );
}

export default function Settings() {
  return (
    <IslandBoundary name="学習記録の管理">
      <SettingsInner />
    </IslandBoundary>
  );
}
