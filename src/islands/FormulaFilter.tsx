import IslandBoundary from '../components/IslandBoundary';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { filterFormulas, type FilterableFormula } from '../lib/domain/formula-filter';

interface Props {
  items: FilterableFormula[];
  topics: { id: string; title: string }[];
  tags: string[];
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/**
 * 公式チートシートの検索・絞り込み（要件3.2, 3.3, 3.6）。
 * 公式カード自体は静的HTMLとして出力し、ここでは表示・非表示のみを切り替える。
 */
function FormulaFilterInner({ items, topics, tags }: Props) {
  const [query, setQuery] = useState('');
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [selTags, setSelTags] = useState<string[]>([]);
  const visible = useMemo(() => new Set(filterFormulas(items, { query, topics: selTopics, tags: selTags })), [items, query, selTopics, selTags]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-formula-id]').forEach((el) => {
      el.hidden = !visible.has(el.dataset.formulaId ?? '');
    });
    document.querySelectorAll<HTMLElement>('[data-formula-group]').forEach((g) => {
      g.hidden = g.querySelector('[data-formula-id]:not([hidden])') === null;
    });
  }, [visible]);

  const reset = () => {
    setQuery('');
    setSelTopics([]);
    setSelTags([]);
  };
  const filtered = query !== '' || selTopics.length > 0 || selTags.length > 0;

  return (
    <div class="card filter">
      <label class="filter-search">
        <span class="sr-only">公式を検索</span>
        <input
          type="search"
          placeholder="公式名・説明・タグで検索（例: 分散 期待値）"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </label>
      <details>
        <summary>分野で絞り込む{selTopics.length > 0 && `（${selTopics.length}）`}</summary>
        <div class="chips">
          {topics.map((t) => (
            <button type="button" class={`chip ${selTopics.includes(t.id) ? 'on' : ''}`} aria-pressed={selTopics.includes(t.id)} onClick={() => setSelTopics(toggle(selTopics, t.id))}>
              {t.title}
            </button>
          ))}
        </div>
      </details>
      <details>
        <summary>タグで絞り込む{selTags.length > 0 && `（${selTags.length}）`}</summary>
        <div class="chips">
          {tags.map((t) => (
            <button type="button" class={`chip ${selTags.includes(t) ? 'on' : ''}`} aria-pressed={selTags.includes(t)} onClick={() => setSelTags(toggle(selTags, t))}>
              #{t}
            </button>
          ))}
        </div>
      </details>
      <p class="row small" aria-live="polite">
        <span>{visible.size} / {items.length} 件</span>
        {filtered && <button type="button" class="btn small" onClick={reset}>条件をリセット</button>}
      </p>
      {visible.size === 0 && (
        <div class="alert warn" role="status">
          条件に一致する公式はありません。<button type="button" class="btn small" onClick={reset}>条件をリセット</button>
        </div>
      )}
    </div>
  );
}

export default function FormulaFilter(props: Props) {
  return (
    <IslandBoundary name="公式の検索">
      <FormulaFilterInner {...props} />
    </IslandBoundary>
  );
}
