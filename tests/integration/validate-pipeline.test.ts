import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatIssues, runValidation } from '../../build/content/pipeline';

const fx = (name: string) => resolve(__dirname, '../fixtures', name);

describe('コンテンツ検証パイプライン', () => {
  it('正しいコンテンツでは問題なし', () => {
    const r = runValidation(fx('content-ok'));
    expect(r.issues).toEqual([]);
    expect(r.content.problems).toHaveLength(1);
  });

  it('不正なコンテンツでは全件を報告する', () => {
    const r = runValidation(fx('content-bad'));
    const keys = r.issues.map((i) => `${i.file}:${i.field}`);
    expect(keys).toEqual(expect.arrayContaining([
      'formulas/discrete.yaml:[0].title',
      'problems/discrete/dup.yaml:topics',
      'problems/other/binom-mean-1.yaml:id',
    ]));
  });

  it('出力はファイル名・項目・理由の形式', () => {
    const text = formatIssues([{ file: 'a.yaml', field: 'x', message: 'だめ' }]);
    expect(text).toContain('a.yaml');
    expect(text).toContain('x');
    expect(text).toContain('だめ');
  });

  it('CLIはエラーがあれば終了コード1で失敗する', () => {
    const run = (dir: string) => {
      try {
        execFileSync('npx', ['tsx', 'build/cli/validate.ts', dir], { encoding: 'utf8', stdio: 'pipe' });
        return { code: 0, out: '' };
      } catch (e) {
        const err = e as { status: number; stderr: string; stdout: string };
        return { code: err.status, out: err.stderr + err.stdout };
      }
    };
    expect(run(fx('content-ok')).code).toBe(0);
    const bad = run(fx('content-bad'));
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('problems/discrete/dup.yaml');
  }, 60_000);
});
