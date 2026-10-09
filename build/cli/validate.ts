import { resolve } from 'node:path';
import { formatIssues, runValidation } from '../content/pipeline';

const dir = resolve(process.argv[2] ?? 'content');
const { content, issues } = runValidation(dir);

if (issues.length > 0) {
  console.error(`コンテンツ検証で ${issues.length} 件のエラーが見つかりました（${dir}）:\n${formatIssues(issues)}`);
  process.exit(1);
}
console.log(
  `コンテンツ検証 OK: 大分類 ${content.categories.length} / 分野 ${content.topics.length} / 公式 ${content.formulas.length} / 分布 ${content.distributions.length} / 問題 ${content.problems.length}`,
);
