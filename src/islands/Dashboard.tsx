import IslandBoundary from '../components/IslandBoundary';
import { useEffect, useState } from 'preact/hooks';
import { loadProblemIndex } from '../lib/client/data';
import { useRecord } from '../lib/client/use-record';
import { summarizeDashboard } from '../lib/domain/dashboard';
import { WEAK_TOPIC_CRITERIA } from '../lib/domain/stats';
import type { ProblemIndexFile } from '../lib/types/problem';
import { url } from '../lib/url';

interface Props {
  topics: { id: string; title: string; category: string }[];
  categories: { id: string; title: string }[];
}

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

function DashboardInner({ topics, categories }: Props) {
  const { record } = useRecord();
  const [index, setIndex] = useState<ProblemIndexFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadProblemIndex().then(setIndex).catch(() => setFailed(true));
  }, []);

  if (!mounted) return <p class="muted" role="status">学習状況を読み込んでいます…</p>;
  if (failed) return <p class="alert ng" role="alert">問題データを読み込めませんでした。ページを再読み込みしてください。</p>;
  if (!index) return <p class="muted" role="status">学習状況を読み込んでいます…</p>;

  const s = summarizeDashboard(record, index.problems, new Date());
  const titleOf = (id: string) => topics.find((t) => t.id === id)?.title ?? id;

  if (s.empty) {
    return (
      <section class="stack" aria-labelledby="getting-started">
        <div class="card stack">
          <h2 id="getting-started" class="setup-title">はじめに</h2>
          <p>このアプリでは、要点で理解 → 公式を暗記 → 演習で定着 → 誤答を復習、のサイクルで準1級の範囲を学習できます。学習記録はこのブラウザに保存されます。</p>
          <ol class="steps">
            <li><a href={url('topics/')}>分野マップ</a>から分野を選び、要点と主要公式を確認する</li>
            <li><a href={url('practice/')}>演習</a>で問題を解き、解説から公式・要点へ戻って理解を補う</li>
            <li>誤答は自動で<a href={url('review/')}>復習</a>リストに入り、1日後・3日後・7日後・14日後に再出題される</li>
            <li>力試しに<a href={url('mock/')}>模試</a>（制限時間付き）を受ける</li>
          </ol>
          <p class="row">
            <a class="btn primary" href={url('topics/')}>分野マップを見る</a>
            <a class="btn" href={url('practice/?mode=random&count=5')}>ランダムに5問解いてみる</a>
          </p>
        </div>
      </section>
    );
  }

  const ordered = topics.map((t) => s.topicStats.find((x) => x.topicId === t.id)).filter((x) => x !== undefined);
  const weak = new Set(s.weakTopics);

  return (
    <div class="stack">
      <section class="tiles" aria-label="学習状況">
        <div class="card tile"><p class="tile-label">総解答数</p><p class="tile-value">{s.overall.attempts}<small> 問</small></p></div>
        <div class="card tile"><p class="tile-label">全体の正答率</p><p class="tile-value">{pct(s.overall.accuracy)}</p></div>
        <a class="card tile tile-link" href={url('review/')}>
          <p class="tile-label">今日の要復習</p>
          <p class="tile-value">{s.dueToday}<small> 問</small></p>
          {s.dueToday === 0 && s.nextDue && <p class="small muted">次回 {s.nextDue.slice(5).replace('-', '/')}</p>}
        </a>
      </section>

      {s.weakTopics.length > 0 && (
        <section class="card stack" aria-labelledby="weak">
          <h2 id="weak" class="setup-title">弱点分野</h2>
          <p class="small muted">{WEAK_TOPIC_CRITERIA.minAttempts}回以上解いて正答率が{Math.round(WEAK_TOPIC_CRITERIA.maxAccuracy * 100)}%未満の分野です。</p>
          <ul class="weak-list">
            {s.weakTopics.map((id) => {
              const st = s.topicStats.find((x) => x.topicId === id);
              return (
                <li>
                  <strong>{titleOf(id)}</strong> <span class="badge ng">正答率 {pct(st?.accuracy ?? null)}</span>
                  <span class="row">
                    <a class="btn small" href={url(`topics/${id}/`)}>要点を見直す</a>
                    <a class="btn small primary" href={url(`practice/?topic=${id}`)}>この分野を演習</a>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section class="card" aria-labelledby="by-topic">
        <h2 id="by-topic" class="setup-title">分野別の成績</h2>
        {ordered.length === 0 ? (
          <p class="muted">まだ問題を解いていません。</p>
        ) : (
          <div class="table-scroll">
            <table class="topic-table">
              <thead><tr><th>分野</th><th>大分類</th><th>解答数</th><th>正答率</th></tr></thead>
              <tbody>
                {ordered.map((t) => {
                  const topic = topics.find((x) => x.id === t.topicId);
                  const acc = t.accuracy ?? 0;
                  return (
                    <tr class={weak.has(t.topicId) ? 'is-weak' : ''}>
                      <td><a href={url(`topics/${t.topicId}/`)}>{titleOf(t.topicId)}</a>{weak.has(t.topicId) && <span class="badge ng"> 弱点</span>}</td>
                      <td class="muted small">{categories.find((c) => c.id === topic?.category)?.title}</td>
                      <td>{t.attempts}</td>
                      <td>
                        <span class="acc">
                          <span class="acc-bar" aria-hidden="true"><span style={{ width: `${Math.round(acc * 100)}%` }} class={acc < 0.6 ? 'low' : acc >= 0.8 ? 'high' : ''} /></span>
                          {pct(t.accuracy)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section class="card" aria-labelledby="mocks">
        <h2 id="mocks" class="setup-title">模試の推移</h2>
        {s.recentMocks.length === 0 ? (
          <p class="muted">まだ模試を受けていません。<a href={url('mock/')}>模試を受ける</a></p>
        ) : (
          <ol class="mock-trend">
            {s.recentMocks.map((m) => (
              <li>
                <span class="small muted mock-date">{fmtDate(m.submittedAt)}</span>
                <span class="acc-bar wide" aria-hidden="true"><span style={{ width: `${m.score}%` }} class={m.score < 60 ? 'low' : 'high'} /></span>
                <span class="mock-score">{m.score}点</span>
                <span class="small muted">（{m.correct}/{m.total}）</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function Dashboard(props: Props) {
  return (
    <IslandBoundary name="ダッシュボード">
      <DashboardInner {...props} />
    </IslandBoundary>
  );
}
