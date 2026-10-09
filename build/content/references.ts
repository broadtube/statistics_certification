import type { LoadedContent, ValidationIssue } from './types';

/** [[topic:id]] / [[formula:id]] / [[dist:id]]（"|表示名" を任意で付与） */
export const INTERNAL_LINK_RE = /\[\[([a-z]+):([^\]|]+)(?:\|([^\]]+))?\]\]/g;
export type LinkKind = 'topic' | 'formula' | 'dist';

export function findInternalLinks(text: string): { kind: string; id: string; label: string | undefined }[] {
  return [...text.matchAll(INTERNAL_LINK_RE)].map((m) => ({ kind: m[1] ?? '', id: (m[2] ?? '').trim(), label: m[3] }));
}

function checkDuplicates<T extends { id: string; file: string }>(items: readonly T[], kind: string, issues: ValidationIssue[]): void {
  const seen = new Map<string, string>();
  for (const it of items) {
    const prev = seen.get(it.id);
    if (prev !== undefined) issues.push({ file: it.file, field: 'id', message: `${kind}ID "${it.id}" が重複しています（${prev} と重複）` });
    else seen.set(it.id, it.file);
  }
}

/**
 * コレクション横断の整合性を検証する（要件13.3）。
 * @param implementedDistributions 数値計算が実装されている分布IDの集合
 */
export function validateReferences(content: LoadedContent, implementedDistributions: ReadonlySet<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const categoryIds = new Set(content.categories.map((c) => c.id));
  const topicIds = new Set(content.topics.map((t) => t.id));
  const formulaIds = new Set(content.formulas.map((f) => f.id));
  const distIds = new Set(content.distributions.map((d) => d.id));

  checkDuplicates(content.categories.map((c) => ({ ...c, file: 'categories.yaml' })), '大分類', issues);
  checkDuplicates(content.topics, '分野', issues);
  checkDuplicates(content.formulas, '公式', issues);
  checkDuplicates(content.distributions, '分布', issues);
  checkDuplicates(content.problems, '問題', issues);

  const missing = (ids: readonly string[], known: ReadonlySet<string>) => ids.filter((id) => !known.has(id));

  const checkLinks = (file: string, field: string, text: string | undefined) => {
    if (!text) return;
    for (const link of findInternalLinks(text)) {
      const known = link.kind === 'topic' ? topicIds : link.kind === 'formula' ? formulaIds : link.kind === 'dist' ? distIds : null;
      if (known === null) {
        issues.push({ file, field, message: `不明な内部リンクの種類です: [[${link.kind}:${link.id}]]（topic / formula / dist が使えます）` });
      } else if (!known.has(link.id)) {
        issues.push({ file, field, message: `内部リンクの参照先が存在しません: [[${link.kind}:${link.id}]]` });
      }
    }
  };

  for (const t of content.topics) {
    if (!categoryIds.has(t.category)) issues.push({ file: t.file, field: 'category', message: `大分類 "${t.category}" が存在しません` });
    const md = missing(t.distributions ?? [], distIds);
    if (md.length) issues.push({ file: t.file, field: 'distributions', message: `分布が存在しません: ${md.join(', ')}` });
    for (const s of t.sections) checkLinks(t.file, `body(${s.heading})`, s.markdown);
  }

  for (const f of content.formulas) {
    if (!topicIds.has(f.topic)) issues.push({ file: f.file, field: `${f.id}.topic`, message: `分野 "${f.topic}" が存在しません` });
    for (const key of ['description', 'conditions', 'derivation', 'pitfalls'] as const) checkLinks(f.file, `${f.id}.${key}`, f[key]);
  }

  for (const d of content.distributions) {
    const mr = missing(d.relations.map((r) => r.to), distIds);
    if (mr.length) issues.push({ file: d.file, field: 'relations', message: `関係先の分布が存在しません: ${mr.join(', ')}` });
    if (d.interactive && !implementedDistributions.has(d.id)) {
      issues.push({ file: d.file, field: 'interactive', message: `分布 "${d.id}" は interactive: true ですが数値計算の実装がありません` });
    }
    checkLinks(d.file, 'notes', d.notes);
  }

  for (const p of content.problems) {
    const mt = missing(p.topics, topicIds);
    if (mt.length) issues.push({ file: p.file, field: 'topics', message: `分野が存在しません: ${mt.join(', ')}` });
    const mf = missing(p.formulas, formulaIds);
    if (mf.length) issues.push({ file: p.file, field: 'formulas', message: `公式が存在しません: ${mf.join(', ')}` });
    checkLinks(p.file, 'statement', p.statement);
    checkLinks(p.file, 'explanation', p.explanation);
  }

  return issues;
}
