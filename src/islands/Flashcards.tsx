import IslandBoundary from '../components/IslandBoundary';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useRecord } from '../lib/client/use-record';
import { deriveFlashcardStates, orderFlashcards, summarizeRatings } from '../lib/domain/flashcards';
import { newId } from '../lib/id';
import { randomRng } from '../lib/random';
import { loadKatex, renderMathInHtml, type KatexLike } from '../lib/render/problem';
import type { FlashcardRating } from '../lib/types/record';
import { url } from '../lib/url';

export interface FlashcardData {
  id: string;
  topic: string;
  title: string;
  /** 公式本体（LaTeX） */
  tex: string;
  /** 説明（数式は data-tex のまま。表示時に描画する） */
  noteHtml: string;
}

interface Props {
  cards: FlashcardData[];
  topics: { id: string; title: string }[];
}

type View =
  | { kind: 'setup' }
  | { kind: 'run'; order: string[]; index: number; flipped: boolean; ratings: FlashcardRating[] }
  | { kind: 'done'; ratings: FlashcardRating[]; total: number };

function FlashcardsInner({ cards, topics }: Props) {
  const { record, store } = useRecord();
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<View>({ kind: 'setup' });
  const [katex, setKatex] = useState<KatexLike | null>(null);
  const states = useMemo(() => deriveFlashcardStates(record.flashcards), [record.flashcards]);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('topic');
    if (t && topics.some((x) => x.id === t)) setSelected([t]);
    void loadKatex().then(setKatex);
  }, [topics]);

  const inRange = cards.filter((c) => selected.length === 0 || selected.includes(c.topic));
  const counts = {
    unsure: inRange.filter((c) => states.get(c.id)?.rating === 'unsure').length,
    known: inRange.filter((c) => states.get(c.id)?.rating === 'known').length,
  };

  const start = () => {
    const order = orderFlashcards(inRange.map((c) => c.id), states, randomRng());
    if (order.length > 0) setView({ kind: 'run', order, index: 0, flipped: false, ratings: [] });
  };

  const rate = (rating: FlashcardRating) => {
    if (view.kind !== 'run' || !view.flipped) return;
    const id = view.order[view.index];
    if (!id) return;
    store.appendFlashcard({ id: newId(), formulaId: id, rating, ratedAt: new Date().toISOString() });
    const ratings = [...view.ratings, rating];
    if (view.index + 1 < view.order.length) setView({ ...view, index: view.index + 1, flipped: false, ratings });
    else setView({ kind: 'done', ratings, total: view.order.length });
  };

  // キーボード: Space/Enter で裏返す、1 = 覚えた、2 = あいまい
  useEffect(() => {
    if (view.kind !== 'run') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.key === ' ' || e.key === 'Enter') && !view.flipped) {
        e.preventDefault();
        setView({ ...view, flipped: true });
      } else if (e.key === '1') rate('known');
      else if (e.key === '2') rate('unsure');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (view.kind === 'setup') {
    return (
      <div class="card stack">
        <h2 class="setup-title">範囲を選ぶ</h2>
        <div class="chips">
          {topics.map((t) => (
            <button
              type="button"
              class={`chip ${selected.includes(t.id) ? 'on' : ''}`}
              aria-pressed={selected.includes(t.id)}
              onClick={() => setSelected((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))}
            >
              {t.title}
            </button>
          ))}
        </div>
        <p class="small muted">
          {selected.length === 0 ? '全分野' : `${selected.length} 分野`}・{inRange.length} 枚（あいまい {counts.unsure} / 覚えた {counts.known} / 未評価 {inRange.length - counts.unsure - counts.known}）。
          「あいまい」と評価したカードから優先して出題します。
        </p>
        <p><button type="button" class="btn primary" disabled={inRange.length === 0} onClick={start}>開始する</button></p>
      </div>
    );
  }

  if (view.kind === 'done') {
    const s = summarizeRatings(view.ratings);
    return (
      <div class="card stack" role="status">
        <p class="big-score">{view.total} 枚を一巡しました</p>
        <p>覚えた: <strong>{s.known}</strong> 枚 ／ あいまい: <strong>{s.unsure}</strong> 枚</p>
        <p class="row">
          <button type="button" class="btn primary" onClick={() => setView({ kind: 'setup' })}>もう一度</button>
          <a class="btn" href={url('formulas/')}>公式チートシートへ</a>
        </p>
      </div>
    );
  }

  const card = byId.get(view.order[view.index] ?? '');
  if (!card) return null;
  const state = states.get(card.id);
  return (
    <div class="stack">
      <p class="small muted">{view.index + 1} / {view.order.length} 枚{state && `（前回: ${state.rating === 'known' ? '覚えた' : 'あいまい'}）`}</p>
      <div class={`card flashcard ${view.flipped ? 'flipped' : ''}`} aria-live="polite">
        <p class="flash-topic small muted">{topics.find((t) => t.id === card.topic)?.title}</p>
        <p class="flash-title">{card.title}</p>
        {view.flipped ? (
          <div class="flash-back">
            {katex ? (
              <div dangerouslySetInnerHTML={{ __html: katex.renderToString(card.tex, { displayMode: true, throwOnError: false, strict: 'ignore' }) }} />
            ) : (
              <code>{card.tex}</code>
            )}
            {card.noteHtml && <div class="prose small" dangerouslySetInnerHTML={{ __html: katex ? renderMathInHtml(card.noteHtml, katex) : card.noteHtml }} />}
            <p class="small"><a href={url(`formulas/${card.id}/`)}>公式の詳細を見る</a></p>
          </div>
        ) : (
          <p class="muted small">公式を思い浮かべてから裏返してください。</p>
        )}
      </div>
      {view.flipped ? (
        <p class="row">
          <button type="button" class="btn primary" onClick={() => rate('known')}>覚えた <span class="kbd">1</span></button>
          <button type="button" class="btn" onClick={() => rate('unsure')}>あいまい <span class="kbd">2</span></button>
        </p>
      ) : (
        <p><button type="button" class="btn primary" onClick={() => setView({ ...view, flipped: true })} autoFocus>裏返す <span class="kbd">Space</span></button></p>
      )}
    </div>
  );
}

export default function Flashcards(props: Props) {
  return (
    <IslandBoundary name="暗記カード">
      <FlashcardsInner {...props} />
    </IslandBoundary>
  );
}
