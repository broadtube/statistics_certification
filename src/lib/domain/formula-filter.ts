export interface FilterableFormula {
  id: string;
  topic: string;
  tags: readonly string[];
  /** 公式名・説明・タグを連結した検索対象の文字列 */
  text: string;
}

export interface FormulaFilter {
  query: string;
  topics: readonly string[];
  tags: readonly string[];
}

export const normalizeForSearch = (s: string): string => s.normalize('NFKC').toLowerCase();

/** 文字列検索（空白区切りの全語を含む）と、分野・タグ（それぞれいずれかに一致）で絞り込む（要件3.2, 3.3） */
export function filterFormulas(items: readonly FilterableFormula[], f: FormulaFilter): string[] {
  const words = normalizeForSearch(f.query).split(/\s+/).filter(Boolean);
  const topics = new Set(f.topics);
  const tags = new Set(f.tags);
  return items
    .filter((it) => {
      const text = normalizeForSearch(`${it.text} ${it.tags.join(' ')}`);
      if (!words.every((w) => text.includes(w))) return false;
      if (topics.size > 0 && !topics.has(it.topic)) return false;
      if (tags.size > 0 && !it.tags.some((t) => tags.has(t))) return false;
      return true;
    })
    .map((it) => it.id);
}
