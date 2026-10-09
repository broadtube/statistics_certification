import { createHash } from 'node:crypto';
import { fillPlaceholders } from '../../src/lib/template';
import { joinBase } from '../../src/lib/url';
import type { LinkRef, Problem, ProblemBankFile, ProblemIndexFile } from '../../src/lib/types/problem';
import { formatIssues, runValidation } from '../content/pipeline';
import { createRenderer, type ContentRenderer } from '../content/render';
import type { LoadedContent, ProblemSource } from '../content/types';
import type { ProblemVariant } from '../variants/generate';

export interface Site {
  base: string;
  content: LoadedContent;
  contentVersion: string;
  renderer: ContentRenderer;
  href: { topic(id: string): string; formula(id: string): string; dist(id: string): string; page(path: string): string };
  problemBank: { index: ProblemIndexFile; banks: Map<string, ProblemBankFile> };
  /** 問題文を1つ目の類題の値で埋めて静的に描画したHTML（一覧表示用） */
  previewHtml(problemId: string): string;
}

function sourceLabel(p: ProblemSource): string {
  return p.source.kind === 'original' ? 'オリジナル' : `${p.source.exam} ${p.source.question} 類題`;
}

function buildProblemBank(
  content: LoadedContent,
  variants: Map<string, ProblemVariant[]>,
  renderer: ContentRenderer,
  contentVersion: string,
  ref: { topic(id: string): LinkRef; formula(id: string): LinkRef },
): Site['problemBank'] {
  const categoryOf = new Map(content.topics.map((t) => [t.id, t.category]));
  const banks = new Map<string, ProblemBankFile>();
  const index: ProblemIndexFile = { contentVersion, problems: [] };

  for (const p of content.problems) {
    const bankId = p.topics[0] ?? '';
    const category = categoryOf.get(bankId) ?? '';
    const vs = variants.get(p.id) ?? [];
    const problem: Problem = {
      id: p.id,
      topics: p.topics,
      category,
      formulas: p.formulas,
      difficulty: p.difficulty,
      type: p.type,
      statementHtml: renderer.render(p.statement, 'template'),
      explanationHtml: renderer.render(p.explanation, 'template'),
      choices: p.choices?.map((c) => ({ id: c.id, html: renderer.render(c.text, 'template'), correct: c.correct })) ?? null,
      shuffleChoices: p.shuffleChoices,
      digits: p.display?.digits ?? null,
      tolerance: p.tolerance ?? null,
      variants: vs,
      sourceLabel: sourceLabel(p),
      topicLinks: p.topics.map(ref.topic),
      formulaLinks: p.formulas.map(ref.formula),
    };
    let bank = banks.get(bankId);
    if (!bank) {
      bank = { contentVersion, topicId: bankId, problems: [] };
      banks.set(bankId, bank);
    }
    bank.problems.push(problem);
    index.problems.push({
      id: p.id,
      topics: p.topics,
      category,
      type: p.type,
      difficulty: p.difficulty,
      bank: bankId,
      variantCount: vs.length,
    });
  }
  return { index, banks };
}

/** コンテンツを検証・変換し、ページ生成に必要なデータ一式を作る。検証エラーがあれば例外 */
export function buildSite(contentDir: string, base: string): Site {
  const run = runValidation(contentDir);
  if (run.issues.length > 0) {
    throw new Error(`コンテンツ検証で ${run.issues.length} 件のエラーがあります:\n${formatIssues(run.issues)}`);
  }
  const { content } = run;
  const hash = createHash('sha256');
  for (const f of run.files) hash.update(f.path).update('\0').update(f.text).update('\0');
  const contentVersion = hash.digest('hex').slice(0, 12);

  const href = {
    topic: (id: string) => joinBase(base, `topics/${id}/`),
    formula: (id: string) => joinBase(base, `formulas/${id}/`),
    dist: (id: string) => joinBase(base, `distributions/${id}/`),
    page: (path: string) => joinBase(base, path),
  };
  const titles = {
    topic: new Map(content.topics.map((t) => [t.id, t.title])),
    formula: new Map(content.formulas.map((f) => [f.id, f.title])),
    dist: new Map(content.distributions.map((d) => [d.id, d.title])),
  };
  const renderer = createRenderer((kind, id) => {
    if (kind !== 'topic' && kind !== 'formula' && kind !== 'dist') return undefined;
    const title = titles[kind].get(id);
    return title === undefined ? undefined : { href: href[kind](id), title };
  });
  const ref = {
    topic: (id: string): LinkRef => ({ id, title: titles.topic.get(id) ?? id, href: href.topic(id) }),
    formula: (id: string): LinkRef => ({ id, title: titles.formula.get(id) ?? id, href: href.formula(id) }),
  };

  const sources = new Map(content.problems.map((p) => [p.id, p]));
  const previews = new Map<string, string>();
  const previewHtml = (problemId: string): string => {
    let html = previews.get(problemId);
    if (html === undefined) {
      const src = sources.get(problemId);
      const values = run.variants.get(problemId)?.[0]?.values ?? {};
      html = src ? renderer.render(fillPlaceholders(src.statement, values), 'static') : '';
      previews.set(problemId, html);
    }
    return html;
  };

  return {
    base,
    content,
    contentVersion,
    renderer,
    href,
    problemBank: buildProblemBank(content, run.variants, renderer, contentVersion, ref),
    previewHtml,
  };
}
