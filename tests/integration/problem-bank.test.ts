import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../../build/site/site';

const fixture = resolve(__dirname, '../fixtures/content-ok');

describe('問題バンクと索引の出力', () => {
  it('分野ごとの問題バンクと軽量な索引を出力する', () => {
    const site = buildSite(fixture, '/sp/');
    const { index, banks } = site.problemBank;
    expect(index.problems).toEqual([
      { id: 'binom-mean-1', topics: ['discrete'], category: 'probability', type: 'numeric', difficulty: 1, bank: 'discrete', variantCount: 20 },
    ]);
    const bank = banks.get('discrete');
    expect(bank?.contentVersion).toBe(index.contentVersion);
    const p = bank?.problems[0];
    expect(p?.statementHtml).toContain('data-tex="B({{n}}, {{p}})"');
    expect(p?.explanationHtml).toContain('{{answer}}');
    expect(p?.variants).toHaveLength(20);
    expect(p?.sourceLabel).toBe('オリジナル');
    expect(p?.digits).toBe(1);
    expect(p?.formulaLinks).toEqual([{ id: 'binom-mean', title: '二項分布の期待値', href: '/sp/formulas/binom-mean/' }]);
    expect(p?.topicLinks).toEqual([{ id: 'discrete', title: '離散分布', href: '/sp/topics/discrete/' }]);
  });

  it('コンテンツのハッシュをバージョンとして付与する', () => {
    const v1 = buildSite(fixture, '/').problemBank.index.contentVersion;
    expect(v1).toMatch(/^[0-9a-f]{12}$/);
    const dir = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(fixture, dir, { recursive: true });
    writeFileSync(join(dir, 'topics/discrete.md'), '---\ntitle: 離散分布\ncategory: probability\norder: 1\nsummary: 変更\n---\n## 定義\na\n## 導出の流れ\nb\n## 落とし穴\nc\n');
    expect(buildSite(dir, '/').problemBank.index.contentVersion).not.toBe(v1);
  });

  it('問題ファイルを追加するだけで索引と分野別バンクに含まれる', () => {
    const dir = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(fixture, dir, { recursive: true });
    writeFileSync(join(dir, 'problems/discrete/new-one.yaml'), [
      'topics: [discrete]', 'formulas: []', 'difficulty: 2', 'type: choice',
      "source: { kind: reference, exam: '2019年', question: '問5' }",
      'statement: 正しいものは？', 'explanation: 解説',
      'choices:', '  - { id: a, text: A, correct: false }', '  - { id: b, text: B, correct: true }',
    ].join('\n'));
    const site = buildSite(dir, '/');
    expect(site.problemBank.index.problems.map((p) => p.id)).toContain('new-one');
    const p = site.problemBank.banks.get('discrete')?.problems.find((x) => x.id === 'new-one');
    expect(p?.choices?.map((c) => c.correct)).toEqual([false, true]);
    expect(p?.sourceLabel).toBe('2019年 問5 類題');
  });

  it('検証エラーがあれば例外にする', () => {
    expect(() => buildSite(resolve(__dirname, '../fixtures/content-bad'), '/')).toThrow(/コンテンツ検証/);
  });
});
