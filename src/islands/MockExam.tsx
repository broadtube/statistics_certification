import IslandBoundary from '../components/IslandBoundary';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import QuestionView, { type AnswerDraft } from '../components/practice/QuestionView';
import { loadProblemIndex, loadProblems } from '../lib/client/data';
import { useRecord } from '../lib/client/use-record';
import { describeInvalid, parseNumericInput, type UserAnswer } from '../lib/domain/grader';
import {
  DEFAULT_MOCK_CONFIGS,
  createMockSession,
  createMockSessionStore,
  remainingMs,
  scoreMock,
  type MockScore,
  type MockSession,
} from '../lib/domain/mock';
import { planSession } from '../lib/domain/planner';
import { newId } from '../lib/id';
import { randomRng } from '../lib/random';
import { choiceOrderFor, loadKatex, renderProblem, type KatexLike, type RenderedProblem } from '../lib/render/problem';
import type { Problem } from '../lib/types/problem';
import type { MockConfig } from '../lib/types/record';
import { url } from '../lib/url';

interface Props {
  categories: { id: string; title: string; mockWeight: number }[];
}

type View =
  | { kind: 'intro' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'running'; session: MockSession; problems: Map<string, Problem> }
  | { kind: 'result'; session: MockSession; problems: Map<string, Problem>; score: MockScore };

const sessionStore = () => createMockSessionStore(() => (typeof window === 'undefined' ? null : window.localStorage));

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toDraft(a: UserAnswer | undefined): AnswerDraft {
  if (!a) return { choiceId: null, raw: '' };
  return a.kind === 'choice' ? { choiceId: a.choiceId, raw: '' } : { choiceId: null, raw: a.raw };
}

function MockExamInner({ categories }: Props) {
  const { store } = useRecord();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  const katexRef = useRef<KatexLike | null>(null);
  const renderCache = useRef(new Map<string, RenderedProblem>());
  const shownAt = useRef(Date.now());
  const weights = Object.fromEntries(categories.map((c) => [c.id, c.mockWeight]));
  const titleOf = (id: string) => categories.find((c) => c.id === id)?.title ?? id;

  const finish = useCallback(
    (session: MockSession, problems: Map<string, Problem>, reason: 'submitted' | 'timeout') => {
      const score = scoreMock(session, problems, reason, new Date(), newId);
      store.appendAttempts(score.attempts);
      store.appendMockResult(score.result);
      sessionStore().clear();
      setView({ kind: 'result', session, problems, score });
      window.scrollTo({ top: 0 });
    },
    [store],
  );

  const open = useCallback(
    async (session: MockSession) => {
      setView({ kind: 'loading' });
      try {
        const [problems, katex] = await Promise.all([loadProblems(session.items.map((i) => i.problemId)), loadKatex()]);
        katexRef.current = katex;
        renderCache.current.clear();
        if (remainingMs(session, new Date()) <= 0) finish(session, problems, 'timeout');
        else {
          shownAt.current = Date.now();
          setNow(Date.now());
          setView({ kind: 'running', session, problems });
        }
      } catch (e) {
        setView({ kind: 'error', message: (e as Error).message });
      }
    },
    [finish],
  );

  // 進行中の模試があれば復元する（要件8.7）
  useEffect(() => {
    const saved = sessionStore().load();
    if (saved) void open(saved);
    else setView({ kind: 'intro' });
  }, [open]);

  const begin = async (preset: MockConfig) => {
    setView({ kind: 'loading' });
    try {
      const index = await loadProblemIndex();
      const rng = randomRng();
      const config: MockConfig = { ...preset, categoryWeights: weights };
      const items = planSession({ kind: 'mock', config }, index.problems, store.load().attempts, rng);
      if (items.length === 0) {
        setView({ kind: 'error', message: '出題できる問題がありません。' });
        return;
      }
      const problems = await loadProblems(items.map((i) => i.problemId));
      const orders: Record<string, string[]> = {};
      for (const p of problems.values()) {
        const o = choiceOrderFor(p, rng);
        if (o) orders[p.id] = o;
      }
      const session = createMockSession(config, items, orders, new Date(), newId());
      sessionStore().save(session);
      await open(session);
    } catch (e) {
      setView({ kind: 'error', message: (e as Error).message });
    }
  };

  // 残り時間の更新と時間切れの自動採点
  useEffect(() => {
    if (view.kind !== 'running') return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (remainingMs(view.session, new Date(t)) <= 0) finish(view.session, view.problems, 'timeout');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, finish]);

  const update = (patch: (s: MockSession) => MockSession) => {
    if (view.kind !== 'running') return;
    const session = patch(view.session);
    sessionStore().save(session);
    setView({ ...view, session });
  };

  /** 表示中の問題に費やした時間を加算して別の問題へ移動する */
  const goTo = (index: number) => {
    update((s) => {
      const spent = Date.now() - shownAt.current;
      shownAt.current = Date.now();
      return { ...s, currentIndex: index, durations: { ...s.durations, [s.currentIndex]: (s.durations[s.currentIndex] ?? 0) + spent } };
    });
    window.scrollTo({ top: 0 });
  };

  const rendered = (problem: Problem, variantIndex: number, order: string[] | undefined): RenderedProblem | null => {
    const katex = katexRef.current;
    if (!katex) return null;
    const key = `${problem.id}:${variantIndex}`;
    let r = renderCache.current.get(key);
    if (!r) {
      r = renderProblem(problem, variantIndex, order ?? null, katex);
      renderCache.current.set(key, r);
    }
    return r;
  };

  // キーボード: ← → で前後の問題、1〜9 で選択肢、M でマーク
  useEffect(() => {
    if (view.kind !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey || target?.tagName === 'INPUT' || target?.tagName === 'SELECT') return;
      const s = view.session;
      const item = s.items[s.currentIndex];
      const problem = item && view.problems.get(item.problemId);
      if (e.key === 'ArrowRight' && s.currentIndex + 1 < s.items.length) goTo(s.currentIndex + 1);
      else if (e.key === 'ArrowLeft' && s.currentIndex > 0) goTo(s.currentIndex - 1);
      else if (e.key === 'm' || e.key === 'M') toggleMark();
      else if (/^[1-9]$/.test(e.key) && problem?.type === 'choice') {
        const order = s.choiceOrders[problem.id] ?? problem.choices?.map((c) => c.id) ?? [];
        const id = order[Number(e.key) - 1];
        if (id) update((x) => ({ ...x, answers: { ...x.answers, [x.currentIndex]: { kind: 'choice', choiceId: id } } }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleMark = () =>
    update((s) => ({ ...s, marked: s.marked.includes(s.currentIndex) ? s.marked.filter((i) => i !== s.currentIndex) : [...s.marked, s.currentIndex] }));

  if (view.kind === 'loading') return <p class="muted" role="status">模試を準備しています…</p>;
  if (view.kind === 'error') {
    return (
      <div class="alert ng" role="alert">
        <p>模試を開始できませんでした。</p>
        <p class="small">{view.message}</p>
        <button type="button" class="btn" onClick={() => setView({ kind: 'intro' })}>戻る</button>
      </div>
    );
  }

  if (view.kind === 'intro') {
    return (
      <div class="stack">
        <div class="card stack">
          <h2 class="setup-title">模試を始める</h2>
          <p class="muted small">大分類の偏りが小さくなるように問題を選び、制限時間付きで出題します。解答中は正誤と解説を表示せず、問題間の移動と解答の変更ができます。途中でページを閉じても、残り時間と解答状況は保持されます（時間は進み続けます）。</p>
          <div class="grid">
            <div class="card">
              <p><strong>本番形式</strong></p>
              <p class="muted small">{DEFAULT_MOCK_CONFIGS.full.questionCount}問・{DEFAULT_MOCK_CONFIGS.full.timeLimitMinutes}分</p>
              <button type="button" class="btn primary" onClick={() => void begin(DEFAULT_MOCK_CONFIGS.full)}>開始する</button>
            </div>
            <div class="card">
              <p><strong>ミニ模試</strong></p>
              <p class="muted small">{DEFAULT_MOCK_CONFIGS.mini.questionCount}問・{DEFAULT_MOCK_CONFIGS.mini.timeLimitMinutes}分</p>
              <button type="button" class="btn" onClick={() => void begin(DEFAULT_MOCK_CONFIGS.mini)}>開始する</button>
            </div>
          </div>
          <p class="small muted">登録されている問題数が指定数に満たない場合は、全問を出題します。本番の形式（問題数・時間）は公式サイトで最新情報を確認してください。</p>
        </div>
      </div>
    );
  }

  if (view.kind === 'result') {
    const { score, session, problems } = view;
    const r = score.result;
    return (
      <section class="stack" aria-labelledby="mock-result">
        <h2 id="mock-result">模試の結果</h2>
        <div class="card">
          <p class="big-score">{r.score} 点<span class="muted">（{r.correct} / {r.total} 問正解・{r.reason === 'timeout' ? '時間切れで終了' : '提出'}）</span></p>
        </div>
        {score.removedProblemIds.length > 0 && (
          <div class="alert warn">コンテンツの更新により {score.removedProblemIds.length} 問が削除されていたため、採点対象から除きました。</div>
        )}
        <div class="card">
          <h3>大分類別の成績</h3>
          <div class="table-scroll">
            <table>
              <thead><tr><th>大分類</th><th>正解</th><th>出題</th><th>正答率</th></tr></thead>
              <tbody>
                {Object.entries(r.byCategory).map(([c, v]) => (
                  <tr><td>{titleOf(c)}</td><td>{v.correct}</td><td>{v.total}</td><td>{v.total ? Math.round((100 * v.correct) / v.total) : 0}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <h3>各問題の正誤と解説</h3>
        {score.items.map((it) => {
          const p = problems.get(it.problemId);
          const item = session.items[it.index];
          if (!p || !item) return <p class="muted small">問 {it.index + 1}: 削除された問題</p>;
          const rp = rendered(p, item.variantIndex, session.choiceOrders[p.id]);
          if (!rp) return null;
          return (
            <details class="mock-review" open={it.status !== 'correct'}>
              <summary>
                問 {it.index + 1}{' '}
                <span class={`badge ${it.status === 'correct' ? 'ok' : 'ng'}`}>{it.status === 'correct' ? '正解' : it.status === 'wrong' ? '不正解' : '未解答'}</span>
              </summary>
              <QuestionView
                problem={p}
                rendered={rp}
                number={it.index + 1}
                total={session.items.length}
                draft={toDraft(session.answers[it.index])}
                onDraft={() => undefined}
                locked
                feedback={{ correct: it.status === 'correct', answered: it.status !== 'unanswered' }}
              />
            </details>
          );
        })}
        <p class="row">
          <a class="btn primary" href={url('review/')}>誤答を復習する</a>
          <a class="btn" href={url('')}>ダッシュボードへ</a>
          <button type="button" class="btn" onClick={() => setView({ kind: 'intro' })}>もう一度受ける</button>
        </p>
      </section>
    );
  }

  // running
  const { session, problems } = view;
  const remaining = remainingMs(session, new Date(now));
  const item = session.items[session.currentIndex];
  const problem = item ? problems.get(item.problemId) : undefined;
  const rp = problem && item ? rendered(problem, item.variantIndex, session.choiceOrders[problem.id]) : null;
  const answer = session.answers[session.currentIndex];
  const answeredCount = session.items.filter((_, i) => {
    const a = session.answers[i];
    return a && (a.kind === 'choice' || a.raw.trim() !== '');
  }).length;
  const numericError =
    answer?.kind === 'numeric' && answer.raw.trim() !== '' ? (() => {
      const r = parseNumericInput(answer.raw);
      return r.ok ? null : describeInvalid(r.reason);
    })() : null;

  const submit = () => {
    const unanswered = session.items.length - answeredCount;
    const msg = unanswered > 0 ? `未解答が ${unanswered} 問あります。提出して採点しますか？` : '提出して採点しますか？';
    if (window.confirm(msg)) {
      const spent = Date.now() - shownAt.current;
      const s = { ...session, durations: { ...session.durations, [session.currentIndex]: (session.durations[session.currentIndex] ?? 0) + spent } };
      finish(s, problems, 'submitted');
    }
  };

  return (
    <div class="mock">
      <div class="mock-bar" role="timer" aria-live="off">
        <span class={`mock-clock ${remaining < 5 * 60_000 ? 'urgent' : ''}`} aria-label={`残り時間 ${formatClock(remaining)}`}>残り {formatClock(remaining)}</span>
        <span class="small muted">{answeredCount} / {session.items.length} 問解答</span>
        <button type="button" class="btn small primary" onClick={submit}>提出する</button>
      </div>
      <nav class="mock-nav" aria-label="問題一覧">
        {session.items.map((_, i) => {
          const a = session.answers[i];
          const done = a && (a.kind === 'choice' || a.raw.trim() !== '');
          const marked = session.marked.includes(i);
          return (
            <button
              type="button"
              class={`mock-nav-item ${done ? 'done' : ''} ${marked ? 'marked' : ''} ${i === session.currentIndex ? 'current' : ''}`}
              aria-current={i === session.currentIndex ? 'step' : undefined}
              aria-label={`問 ${i + 1}${done ? '（解答済み）' : '（未解答）'}${marked ? '（見直しマーク）' : ''}`}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>
      <p class="small muted legend">
        <span class="mock-nav-item done sample">1</span> 解答済み <span class="mock-nav-item sample">2</span> 未解答 <span class="mock-nav-item marked sample">3</span> 見直しマーク
      </p>
      {problem && rp && item ? (
        <QuestionView
          problem={problem}
          rendered={rp}
          number={session.currentIndex + 1}
          total={session.items.length}
          draft={toDraft(answer)}
          onDraft={(d) =>
            update((s) => ({
              ...s,
              answers: { ...s.answers, [s.currentIndex]: problem.type === 'choice' ? { kind: 'choice', choiceId: d.choiceId ?? '' } : { kind: 'numeric', raw: d.raw } },
            }))
          }
          locked={false}
          inputError={numericError}
          onEnter={() => session.currentIndex + 1 < session.items.length && goTo(session.currentIndex + 1)}
        />
      ) : (
        <p class="alert warn">この問題はコンテンツの更新により削除されました。採点対象から除かれます。</p>
      )}
      <p class="row mock-actions">
        <button type="button" class="btn" disabled={session.currentIndex === 0} onClick={() => goTo(session.currentIndex - 1)}>← 前へ</button>
        <button type="button" class={`btn ${session.marked.includes(session.currentIndex) ? 'primary' : ''}`} aria-pressed={session.marked.includes(session.currentIndex)} onClick={toggleMark}>
          {session.marked.includes(session.currentIndex) ? '見直しマークを外す' : '見直し用にマーク'} <span class="kbd">M</span>
        </button>
        <button type="button" class="btn" disabled={session.currentIndex + 1 >= session.items.length} onClick={() => goTo(session.currentIndex + 1)}>次へ →</button>
      </p>
    </div>
  );
}

export default function MockExam(props: Props) {
  return (
    <IslandBoundary name="模試">
      <MockExamInner {...props} />
    </IslandBoundary>
  );
}
