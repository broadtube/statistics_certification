import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';
import {
  categoriesFileSchema,
  distributionSchema,
  formulasFileSchema,
  ID_PATTERN,
  problemSchema,
  topicFrontmatterSchema,
} from './schemas';
import type { LoadedContent, TopicSection, ValidationIssue } from './types';

export interface SourceFile {
  /** content ディレクトリからの相対パス（区切りは "/"） */
  path: string;
  text: string;
}

/** 要点本文に必須の見出し（主要公式・関連問題はページ側で生成する） */
export const REQUIRED_TOPIC_HEADINGS = ['定義', '導出の流れ', '落とし穴'] as const;

export interface LoadResult {
  content: LoadedContent;
  issues: ValidationIssue[];
}

function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const seg of path) {
    if (typeof seg === 'number') out += `[${seg}]`;
    else out += out === '' ? String(seg) : `.${String(seg)}`;
  }
  return out === '' ? '(root)' : out;
}

function zodIssues(file: string, error: z.ZodError): ValidationIssue[] {
  return error.issues.map((i) => ({ file, field: formatPath(i.path), message: i.message }));
}

function stem(path: string): string {
  const name = path.split('/').pop() ?? path;
  return name.replace(/\.(ya?ml|md)$/, '');
}

function checkId(file: string, id: string, issues: ValidationIssue[]): void {
  if (!ID_PATTERN.test(id)) {
    issues.push({ file, field: 'id', message: `ID "${id}" は英小文字・数字・ハイフンのみ使用できます（ファイル名がIDになります）` });
  }
}

function parseYamlSafe(file: string, text: string, issues: ValidationIssue[]): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: parseYaml(text) ?? null };
  } catch (e) {
    issues.push({ file, field: '(file)', message: `YAMLの構文エラー: ${(e as Error).message.split('\n')[0]}` });
    return { ok: false };
  }
}

export function splitFrontmatter(text: string): { frontmatter: string; body: string } | null {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  return { frontmatter: m[1] ?? '', body: m[2] ?? '' };
}

/** "## 見出し" 単位で本文を分割する（最初の見出しより前の文章は捨てずに "(前文)" とする） */
export function splitSections(body: string): TopicSection[] {
  const sections: TopicSection[] = [];
  let current: TopicSection | null = null;
  const pre: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      current = { heading: m[1] ?? '', markdown: '' };
      sections.push(current);
    } else if (current) {
      current.markdown += `${line}\n`;
    } else {
      pre.push(line);
    }
  }
  for (const s of sections) s.markdown = s.markdown.trim();
  const preText = pre.join('\n').trim();
  if (preText !== '') sections.unshift({ heading: '(前文)', markdown: preText });
  return sections;
}

export function loadContentFromFiles(files: readonly SourceFile[]): LoadResult {
  const issues: ValidationIssue[] = [];
  const content: LoadedContent = { categories: [], topics: [], formulas: [], distributions: [], problems: [] };

  for (const { path, text } of files) {
    if (path === 'categories.yaml') {
      const y = parseYamlSafe(path, text, issues);
      if (!y.ok) continue;
      const r = categoriesFileSchema.safeParse(y.value);
      if (r.success) content.categories.push(...r.data);
      else issues.push(...zodIssues(path, r.error));
    } else if (path.startsWith('topics/') && path.endsWith('.md')) {
      const id = stem(path);
      checkId(path, id, issues);
      const parts = splitFrontmatter(text);
      if (!parts) {
        issues.push({ file: path, field: '(file)', message: '先頭にYAMLフロントマター（--- で囲む）が必要です' });
        continue;
      }
      const y = parseYamlSafe(path, parts.frontmatter, issues);
      if (!y.ok) continue;
      const r = topicFrontmatterSchema.safeParse(y.value);
      if (!r.success) {
        issues.push(...zodIssues(path, r.error));
        continue;
      }
      const sections = splitSections(parts.body);
      const headings = new Set(sections.map((s) => s.heading));
      const missing = REQUIRED_TOPIC_HEADINGS.filter((h) => !headings.has(h));
      if (missing.length > 0 && !r.data.draft) {
        issues.push({ file: path, field: 'body', message: `必須の見出しがありません: ${missing.map((h) => `「## ${h}」`).join('、')}` });
      }
      content.topics.push({ ...r.data, id, file: path, sections });
    } else if (path.startsWith('formulas/') && /\.ya?ml$/.test(path)) {
      const y = parseYamlSafe(path, text, issues);
      if (!y.ok) continue;
      const r = formulasFileSchema.safeParse(y.value);
      if (r.success) content.formulas.push(...r.data.map((f) => ({ ...f, file: path })));
      else issues.push(...zodIssues(path, r.error));
    } else if (path.startsWith('distributions/') && /\.ya?ml$/.test(path)) {
      const id = stem(path);
      checkId(path, id, issues);
      const y = parseYamlSafe(path, text, issues);
      if (!y.ok) continue;
      const r = distributionSchema.safeParse(y.value);
      if (r.success) content.distributions.push({ ...r.data, id, file: path });
      else issues.push(...zodIssues(path, r.error));
    } else if (path.startsWith('problems/') && /\.ya?ml$/.test(path)) {
      const id = stem(path);
      checkId(path, id, issues);
      const y = parseYamlSafe(path, text, issues);
      if (!y.ok) continue;
      const r = problemSchema.safeParse(y.value);
      if (r.success) content.problems.push({ ...r.data, id, file: path });
      else issues.push(...zodIssues(path, r.error));
    }
  }

  content.categories.sort((a, b) => a.order - b.order);
  content.topics.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  content.distributions.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  content.problems.sort((a, b) => a.id.localeCompare(b.id));
  return { content, issues };
}

function walk(dir: string, root: string, out: SourceFile[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else if (/\.(ya?ml|md)$/.test(name)) {
      out.push({ path: relative(root, full).split(sep).join('/'), text: readFileSync(full, 'utf8') });
    }
  }
}

export function readContentDir(root: string): SourceFile[] {
  const out: SourceFile[] = [];
  walk(root, root, out);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
