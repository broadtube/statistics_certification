import IslandBoundary from '../components/IslandBoundary';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import QuestionView, { type AnswerDraft } from '../components/practice/QuestionView';
import { loadProblemIndex, loadProblems } from '../lib/client/data';
import { useRecord } from '../lib/client/use-record';
import { describeInvalid, gradeAnswer, type UserAnswer } from '../lib/domain/grader';
import { planSession, type SessionItem } from '../lib/domain/planner';
import { DEFAULT_COUNT, parsePracticeQuery, summarizeSession, type PracticeRequest, type SessionSummary } from '../lib/domain/session';
import { deriveReviewSchedule, dueItems, nextDueDate } from '../lib/domain/srs';
import { knownAttempts } from '../lib/domain/stats';
import { newId } from '../lib/id';
import { randomRng } from '../lib/random';
import { choiceOrderFor, loadKatex, renderProblem, type KatexLike, type RenderedProblem } from '../lib/render/problem';
import type { Problem, ProblemIndexFile } from '../lib/types/problem';
import type { AttemptContext } from '../lib/types/record';
import { url } from '../lib/url';

export interface TopicOption {
  id: string;
  title: string;
  category: string;
  problemCount: number;
}

interface Props {
  mode: 'practice' | 'review';
  topics: TopicOption[];
  categories: { id: string; title: string }[];
}

interface Slot {
  item: SessionItem;
  problem: Problem;
  rendered: RenderedProblem;
  draft: AnswerDraft;
  inputError: string | null;
  graded: { correct: boolean } | null;
  shownAt: number;
}

type View =
  | { kind: 'setup'; notice: string | null }
  | { kind: 'review-intro' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retry: () => void }
  | { kind: 'session'; slots: Slot[]; index: number; request: PracticeRequest | { kind: 'review' } }
  | { kind: 'summary'; summary: SessionSummary; request: PracticeRequest | { kind: 'review' } };

const titleOf = (topics: readonly TopicOption[], id: string) => topics.find((t) => t.id === id)?.title ?? id;

function PracticeInner({ mode, topics, categories }: Props) {
  const { record, store } = useRecord();
  const [view, setView] = useState<View>(mode === 'review' ? { kind: 'review-intro' } : { kind: 'loading' });
  const [index, setIndex] = useState<ProblemIndexFile | null>(null);
  const katexRef = useRef<KatexLike | null>(null);
  const context: AttemptContext = mode === 'review' ? 'review' : 'practice';

  const start = useCallback(
    async (request: PracticeRequest | { kind: 'review' }) => {
      setView({ kind: 'loading' });
      try {
        const idx = await loadProblemIndex();
        setIndex(idx);
        const known = new Set(idx.problems.map((p) => p.id));
        const knownTopics = new Set(topics.map((t) => t.id));
        if (request.kind === 'single' && !known.has(request.problemId)) {
          setView({ kind: 'setup', notice: `指定された問題（${request.problemId}）は見つかりませんでした。条件を選んで演習を開始してください。` });
          return;
        }
        if (request.kind === 'topic' && !request.topicIds.some((t) => knownTopics.has(t))) {
          setView({ kind: 'setup', notice: `指定された分野（${request.topicIds.join(', ')}）は見つかりませんでした。条件を選んで演習を開始してください。` });
          return;
        }
        const attempts = store.load().attempts;
        const rng = randomRng();
        let items: SessionItem[];
        if (request.kind === 'review') items = planSession({ kind: 'review', asOf: new Date() }, idx.problems, attempts, rng);
        else if (request.kind === 'list') {
          items = request.problemIds.flatMap((id) => planSession({ kind: 'single', problemId: id }, idx.problems, attempts, rng));
        } else if (request.kind === 'topic') {
          items = planSession({ kind: 'topic', topicIds: request.topicIds.filter((t) => knownTopics.has(t)), count: request.count }, idx.problems, attempts, rng);
        } else items = planSession(request, idx.problems, attempts, rng);

        if (items.length === 0) {
          setView(
            request.kind === 'review'
              ? { kind: 'review-intro' }
              : { kind: 'setup', notice: '条件に合う問題がありません。別の分野を選んでください。' },
          );
          return;
        }
        const [problems, katex] = await Promise.all([loadProblems(items.map((i) => i.problemId)), loadKatex()]);
        katexRef.current = katex;
        const slots: Slot[] = items.flatMap((item) => {
          const problem = problems.get(item.problemId);
          if (!problem) return [];
          const rendered = renderProblem(problem, item.variantIndex, choiceOrderFor(problem, rng), katex);
          return [{ item, problem, rendered, draft: { choiceId: null, raw: '' }, inputError: null, graded: null, shownAt: Date.now() }];
        });
        setView({ kind: 'session', slots, index: 0, request });
      } catch (e) {
        setView({ kind: 'error', message: (e as Error).message, retry: () => void start(request) });
      }
    },
    [store, topics],
  );

  // 初回: クエリで開始条件が指定されていれば開始し、なければ設定画面を表示する
  useEffect(() => {
    if (mode === 'review') {
      void loadProblemIndex().then(setIndex).catch(() => undefined);
      return;
    }
    const req = parsePracticeQuery(window.location.search);
    if (req) void start(req);
    else setView({ kind: 'setup', notice: null });
  }, [mode, start]);

  const updateSlot = (patch: Partial<Slot>) => {
    setView((v) => {
      if (v.kind !== 'session') return v;
      const slots = v.slots.map((s, i) => (i === v.index ? { ...s, ...patch } : s));
      return { ...v, slots };
    });
  };

  const submit = () => {
    if (view.kind !== 'session') return;
    const slot = view.slots[view.index];
    if (!slot || slot.graded) return;
    const answer: UserAnswer | null =
      slot.problem.type === 'choice'
        ? slot.draft.choiceId
          ? { kind: 'choice', choiceId: slot.draft.choiceId }
          : null
        : { kind: 'numeric', raw: slot.draft.raw };
    if (!answer) {
      updateSlot({ inputError: '選択肢を1つ選んでください。' });
      return;
    }
    const r = gradeAnswer(slot.problem, slot.item.variantIndex, answer);
    if (r.status === 'invalid-input') {
      updateSlot({ inputError: describeInvalid(r.reason) });
      return;
    }
    store.appendAttempts([
      {
        id: newId(),
        problemId: slot.problem.id,
        variantIndex: slot.item.variantIndex,
        answeredAt: new Date().toISOString(),
        correct: r.correct,
        answer: r.normalizedAnswer,
        durationMs: Math.max(0, Date.now() - slot.shownAt),
        context,
      },
    ]);
    updateSlot({ graded: { correct: r.correct }, inputError: null });
  };

  const next = () => {
    if (view.kind !== 'session') return;
    if (view.index + 1 < view.slots.length) {
      setView({ ...view, index: view.index + 1, slots: view.slots.map((s, i) => (i === view.index + 1 ? { ...s, shownAt: Date.now() } : s)) });
      window.scrollTo({ top: 0 });
      return;
    }
    const results = view.slots.filter((s) => s.graded).map((s) => ({ problemId: s.problem.id, correct: s.graded?.correct ?? false }));
    const topicsOf = new Map(view.slots.map((s) => [s.problem.id, s.problem.topics]));
    setView({ kind: 'summary', summary: summarizeSession(results, topicsOf), request: view.request });
    window.scrollTo({ top: 0 });
  };

  // キーボード操作: 1〜9 で選択肢、Enter で解答・次へ（要件15.4）
  useEffect(() => {
    if (view.kind !== 'session') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text';
      const slot = view.slots[view.index];
      if (!slot) return;
      if (!typing && /^[1-9]$/.test(e.key) && slot.rendered.choices && !slot.graded) {
        const c = slot.rendered.choices[Number(e.key) - 1];
        if (c) updateSlot({ draft: { ...slot.draft, choiceId: c.id }, inputError: null });
      } else if (e.key === 'Enter' && !typing && target?.tagName !== 'BUTTON' && target?.tagName !== 'A') {
        e.preventDefault();
        if (slot.graded) next();
        else submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (view.kind === 'loading') return <p class="muted" role="status">問題を準備しています…</p>;

  if (view.kind === 'error') {
    return (
      <div class="alert ng" role="alert">
        <p>問題データを読み込めませんでした。通信状況を確認して再試行してください。</p>
        <p class="small">{view.message}</p>
        <button type="button" class="btn" onClick={view.retry}>再試行</button>
      </div>
    );
  }

  if (view.kind === 'review-intro') {
    return <ReviewIntro record={record} index={index} onStart={() => void start({ kind: 'review' })} />;
  }

  if (view.kind === 'setup') return <Setup topics={topics} categories={categories} notice={view.notice} onStart={(r) => void start(r)} />;

  if (view.kind === 'summary') {
    const { summary } = view;
    const pct = summary.accuracy === null ? 0 : Math.round(summary.accuracy * 100);
    const wrongHref = url(`practice/?problems=${summary.wrongProblemIds.join(',')}`);
    return (
      <section class="stack" aria-labelledby="summary-title">
        <h2 id="summary-title">結果</h2>
        <div class="card summary-head">
          <p class="big-score">{summary.correct} / {summary.total} 問正解<span class="muted">（正答率 {pct}%）</span></p>
        </div>
        {summary.byTopic.length > 0 && (
          <div class="card">
            <h3>分野別の内訳</h3>
            <div class="table-scroll">
              <table>
                <thead><tr><th>分野</th><th>正解</th><th>出題</th></tr></thead>
                <tbody>
                  {summary.byTopic.map((t) => (
                    <tr><td><a href={url(`topics/${t.topicId}/`)}>{titleOf(topics, t.topicId)}</a></td><td>{t.correct}</td><td>{t.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {summary.wrongProblemIds.length > 0 && (
          <div class="card">
            <h3>誤答した問題</h3>
            <ul>
              {summary.wrongProblemIds.map((id) => {
                const entry = index?.problems.find((p) => p.id === id);
                return (
                  <li>
                    <a href={url(`practice/?problem=${id}`)}>{id}</a>
                    {entry && <span class="muted small">（{entry.topics.map((t) => titleOf(topics, t)).join('・')}）</span>}
                    {entry && <> — <a class="small" href={url(`topics/${entry.topics[0] ?? ''}/`)}>要点を見直す</a></>}
                  </li>
                );
              })}
            </ul>
            <p class="small muted">誤答した問題は復習リストに登録されました。翌日以降に「復習」から再出題されます。</p>
            <a class="btn" href={wrongHref}>誤答した問題を今すぐ解き直す</a>
          </div>
        )}
        <p class="row">
          {view.request.kind !== 'review' && <button type="button" class="btn primary" onClick={() => void start(view.request)}>同じ条件でもう一度</button>}
          <a class="btn" href={url('practice/')}>条件を変えて演習する</a>
          <a class="btn" href={url('')}>ダッシュボードへ</a>
        </p>
      </section>
    );
  }

  // session
  const slot = view.slots[view.index];
  if (!slot) return null;
  const answeredCount = view.slots.filter((s) => s.graded).length;
  return (
    <div>
      <div class="session-bar">
        <span class="small muted">{mode === 'review' ? '復習' : '演習'}：{answeredCount} / {view.slots.length} 問解答済み</span>
        <div class="progress" aria-hidden="true"><span style={{ width: `${(answeredCount / view.slots.length) * 100}%` }} /></div>
      </div>
      <QuestionView
        problem={slot.problem}
        rendered={slot.rendered}
        number={view.index + 1}
        total={view.slots.length}
        draft={slot.draft}
        onDraft={(d) => updateSlot({ draft: d, inputError: null })}
        locked={slot.graded !== null}
        inputError={slot.inputError}
        feedback={slot.graded ? { correct: slot.graded.correct, answered: true } : null}
        onEnter={() => (slot.graded ? next() : submit())}
      />
      <p class="row session-actions">
        {slot.graded ? (
          <button type="button" class="btn primary" onClick={next} autoFocus>
            {view.index + 1 < view.slots.length ? '次の問題へ' : '結果を見る'} <span class="kbd">Enter</span>
          </button>
        ) : (
          <button type="button" class="btn primary" onClick={submit}>解答する <span class="kbd">Enter</span></button>
        )}
      </p>
    </div>
  );
}

function Setup({ topics, categories, notice, onStart }: { topics: TopicOption[]; categories: { id: string; title: string }[]; notice: string | null; onStart(r: PracticeRequest): void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const available = topics.filter((t) => t.problemCount > 0);
  const grouped = useMemo(
    () => categories.map((c) => ({ ...c, topics: available.filter((t) => t.category === c.id) })).filter((g) => g.topics.length > 0),
    [categories, available],
  );
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <section class="stack">
      {notice && <div class="alert warn" role="alert">{notice}</div>}
      <div class="card stack">
        <h2 class="setup-title">分野を選んで演習</h2>
        {grouped.length === 0 && <p class="muted">問題が登録されている分野はまだありません。</p>}
        {grouped.map((g) => (
          <fieldset class="topic-select">
            <legend>{g.title}</legend>
            <div class="chips">
              {g.topics.map((t) => (
                <button type="button" class={`chip ${selected.includes(t.id) ? 'on' : ''}`} aria-pressed={selected.includes(t.id)} onClick={() => toggle(t.id)}>
                  {t.title}（{t.problemCount}）
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <label class="row">
          問題数
          <select value={count} onChange={(e) => setCount(Number((e.target as HTMLSelectElement).value))}>
            {[5, 10, 20, 30].map((n) => <option value={n}>{n} 問</option>)}
          </select>
        </label>
        <p class="row">
          <button type="button" class="btn primary" disabled={selected.length === 0} onClick={() => onStart({ kind: 'topic', topicIds: selected, count })}>
            選んだ分野で開始
          </button>
          <button type="button" class="btn" disabled={available.length === 0} onClick={() => onStart({ kind: 'random', topicIds: 'all', count })}>
            全分野からランダムに出題
          </button>
        </p>
        <p class="small muted">まだ解いていない問題が優先して出題されます。</p>
      </div>
    </section>
  );
}

function ReviewIntro({ record, index, onStart }: { record: ReturnType<typeof useRecord>['record']; index: ProblemIndexFile | null; onStart(): void }) {
  if (!index) return <p class="muted" role="status">復習リストを確認しています…</p>;
  const schedule = deriveReviewSchedule(knownAttempts(record.attempts, index.problems));
  const now = new Date();
  const due = dueItems(schedule, now);
  const next = nextDueDate(schedule, now);
  const scheduled = [...schedule.values()].filter((s) => s.status === 'scheduled').length;
  if (due.length === 0) {
    return (
      <div class="card stack">
        <p><strong>今日復習する問題はありません。</strong></p>
        <p class="muted">{next ? `次回の復習予定日は ${next.replace(/-/g, '/')} です（復習リスト ${scheduled} 問）。` : '誤答した問題が復習リストに登録されると、ここから再出題されます。'}</p>
        <p class="row"><a class="btn primary" href={url('practice/')}>演習する</a></p>
      </div>
    );
  }
  return (
    <div class="card stack">
      <p class="big-score">今日の復習: {due.length} 問</p>
      <p class="muted small">誤答した問題を 1日後 → 3日後 → 7日後 → 14日後 の間隔で再出題します。14日後の復習でも正解すると、復習リストから外れます。</p>
      <p><button type="button" class="btn primary" onClick={onStart}>復習を始める</button></p>
    </div>
  );
}

export default function Practice(props: Props) {
  return (
    <IslandBoundary name="演習">
      <PracticeInner {...props} />
    </IslandBoundary>
  );
}
