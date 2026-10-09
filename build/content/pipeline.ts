import { IMPLEMENTED_DISTRIBUTIONS } from '../../src/lib/distributions/ids';
import { createEvaluator } from '../variants/evaluator';
import { describeVariantError, generateVariants, type ProblemVariant } from '../variants/generate';
import { loadContentFromFiles, readContentDir, type SourceFile } from './load';
import { validateReferences } from './references';
import type { LoadedContent, ValidationIssue } from './types';

export interface ValidationRun {
  files: SourceFile[];
  content: LoadedContent;
  variants: Map<string, ProblemVariant[]>;
  issues: ValidationIssue[];
}

/** スキーマ検証 → 参照整合性検証 → 類題の事前生成と検証 を実行する（要件13.3–13.5） */
export function runValidation(contentDir: string): ValidationRun {
  const files = readContentDir(contentDir);
  const { content, issues } = loadContentFromFiles(files);
  issues.push(...validateReferences(content, IMPLEMENTED_DISTRIBUTIONS));

  const variants = new Map<string, ProblemVariant[]>();
  const evaluator = createEvaluator();
  for (const p of content.problems) {
    const r = generateVariants(p, evaluator);
    if (r.ok) variants.set(p.id, r.variants);
    else issues.push({ file: p.file, field: 'variants', message: describeVariantError(r.error) });
  }
  return { files, content, variants, issues };
}

export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues.map((i) => `  ✗ ${i.file}  [${i.field}]  ${i.message}`).join('\n');
}
