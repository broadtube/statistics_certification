// コンテンツ検証に加え、ビルド時・実行時に描画される全テキスト（要点本文・公式カード・問題文・選択肢・解説）を
// KaTeX で描画し、LaTeX の構文エラーや未解決リンクをビルド前に見つける。
// 使い方: npx tsx scripts/check-content.ts [content ディレクトリ]
import { resolve } from 'node:path';
import { formatIssues, runValidation } from '../build/content/pipeline';
import { buildSite } from '../build/site/site';
import { generateVariants } from '../build/variants/generate';
import { fillPlaceholders } from '../src/lib/template';

const dir = resolve(process.argv[2] ?? 'content');
const { issues } = runValidation(dir);
if (issues.length > 0) {
  console.error(`コンテンツ検証で ${issues.length} 件のエラー:\n${formatIssues(issues)}`);
  process.exit(1);
}
const site = buildSite(dir, '/');
const { renderer, content } = site;
const errors: string[] = [];
const check = (where: string, f: () => unknown) => {
  try {
    const out = f();
    if (typeof out === 'string' && out.includes('tex-error')) errors.push(`${where}: 数式を描画できません`);
  } catch (e) {
    errors.push(`${where}: ${String((e as Error).message).split('\n')[0]}`);
  }
};
for (const t of content.topics) for (const [k, v] of Object.entries(t)) if (typeof v === 'string' && k !== 'id') check(`topic ${t.id}.${k}`, () => renderer.render(v, 'static'));
for (const f of content.formulas) {
  check(`formula ${f.id}.body`, () => renderer.renderTex(f.body, true));
  for (const k of ['description', 'derivation', 'conditions', 'pitfalls'] as const) {
    const v = f[k];
    if (typeof v === 'string') check(`formula ${f.id}.${k}`, () => renderer.render(v, 'static'));
  }
}
for (const p of content.problems) {
  // 類題の1件目の値を差し込んでから描画する（実行時と同じ状態）
  const v = generateVariants(p);
  const values = v.ok ? v.variants[0]?.values : undefined;
  const fill = (s: string) => (values ? fillPlaceholders(s, values) : s);
  check(`problem ${p.id}.statement`, () => renderer.render(fill(p.statement), 'static'));
  check(`problem ${p.id}.explanation`, () => renderer.render(fill(p.explanation), 'static'));
  for (const c of p.choices ?? []) check(`problem ${p.id}.choice ${c.id}`, () => renderer.render(fill(c.text), 'static'));
}
if (errors.length > 0) {
  console.error(`描画エラー ${errors.length} 件:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`描画チェック OK: 分野 ${content.topics.length} / 公式 ${content.formulas.length} / 問題 ${content.problems.length}`);
