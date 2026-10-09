import { describe, expect, it } from 'vitest';
import { loadContentFromFiles, type SourceFile } from '../../build/content/load';

const category = `
- id: probability
  title: 確率と分布
  order: 1
`;

const topic = (extra = '') => `---
title: 離散分布
category: probability
order: 1
summary: 二項分布・ポアソン分布など
${extra}---

## 定義
本文

## 導出の流れ
本文

## 落とし穴
本文
`;

const formulas = `
- id: binom-mean
  topic: discrete
  title: 二項分布の期待値
  body: E[X] = np
  tags: [二項分布, 期待値]
`;

const dist = `
title: 正規分布
kind: continuous
interactive: true
pmfOrPdf: f(x)=\\frac{1}{\\sqrt{2\\pi}\\sigma}e^{-(x-\\mu)^2/2\\sigma^2}
mean: \\mu
variance: \\sigma^2
paramsDoc:
  - { symbol: \\mu, meaning: 平均, range: 実数 }
relations: []
diagramPosition: { x: 1, y: 2 }
`;

const numericProblem = `
topics: [discrete]
formulas: [binom-mean]
difficulty: 1
type: numeric
source: { kind: original }
statement: 二項分布 $B({{n}}, 0.5)$ の期待値は？
explanation: $np$
params:
  n: { min: 10, max: 20, step: 2 }
answer: n * 0.5
`;

const choiceProblem = `
topics: [discrete]
formulas: []
difficulty: 2
type: choice
source: { kind: reference, exam: '2019年', question: '問3' }
statement: 正しいものを選べ
explanation: 解説
choices:
  - { id: a, text: A, correct: true }
  - { id: b, text: B, correct: false }
`;

function baseFiles(): SourceFile[] {
  return [
    { path: 'categories.yaml', text: category },
    { path: 'topics/discrete.md', text: topic() },
    { path: 'formulas/discrete.yaml', text: formulas },
    { path: 'distributions/normal.yaml', text: dist },
    { path: 'problems/discrete/binom-mean-1.yaml', text: numericProblem },
    { path: 'problems/discrete/choice-1.yaml', text: choiceProblem },
  ];
}

describe('コンテンツ読込とスキーマ検証', () => {
  it('正しいコンテンツを型付きデータとして読み込む', () => {
    const { content, issues } = loadContentFromFiles(baseFiles());
    expect(issues).toEqual([]);
    expect(content.categories.map((c) => c.id)).toEqual(['probability']);
    expect(content.topics[0]).toMatchObject({ id: 'discrete', title: '離散分布', category: 'probability' });
    expect(content.topics[0]?.sections.map((s) => s.heading)).toEqual(['定義', '導出の流れ', '落とし穴']);
    expect(content.formulas[0]).toMatchObject({ id: 'binom-mean', topic: 'discrete', file: 'formulas/discrete.yaml' });
    expect(content.distributions[0]).toMatchObject({ id: 'normal', kind: 'continuous' });
    expect(content.problems.map((p) => p.id).sort()).toEqual(['binom-mean-1', 'choice-1']);
    expect(content.problems.find((p) => p.id === 'binom-mean-1')?.variants).toBe(20);
  });

  it('必須項目の欠落をファイル名と項目付きで報告する', () => {
    const files = baseFiles().map((f) =>
      f.path === 'formulas/discrete.yaml' ? { ...f, text: formulas.replace('  title: 二項分布の期待値\n', '') } : f,
    );
    const { issues } = loadContentFromFiles(files);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'formulas/discrete.yaml', field: '[0].title' }));
  });

  it('型不一致を報告する', () => {
    const files = baseFiles().map((f) =>
      f.path === 'topics/discrete.md' ? { ...f, text: topic().replace('order: 1', 'order: first') } : f,
    );
    const { issues } = loadContentFromFiles(files);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'topics/discrete.md', field: 'order' }));
  });

  it('IDの形式（英小文字・数字・ハイフン）を検証する', () => {
    const files = [...baseFiles(), { path: 'problems/discrete/Bad_ID.yaml', text: numericProblem }];
    const { issues } = loadContentFromFiles(files);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/Bad_ID.yaml', field: 'id' }));
  });

  it('要点本文に必須の見出しが欠けていれば報告する', () => {
    const files = baseFiles().map((f) =>
      f.path === 'topics/discrete.md' ? { ...f, text: topic().replace('## 落とし穴\n本文\n', '') } : f,
    );
    const { issues } = loadContentFromFiles(files);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'topics/discrete.md', field: 'body', message: expect.stringContaining('落とし穴') }));
  });

  it('下書きの分野は必須見出しを検査しない', () => {
    const draft = '---\ntitle: 時系列\ncategory: probability\norder: 2\nsummary: 準備中\ndraft: true\n---\n';
    const { content, issues } = loadContentFromFiles([...baseFiles(), { path: 'topics/ts.md', text: draft }]);
    expect(issues).toEqual([]);
    expect(content.topics.find((t) => t.id === 'ts')?.draft).toBe(true);
    expect(content.topics.find((t) => t.id === 'discrete')?.draft).toBe(false);
  });

  it('YAMLの構文エラーを報告する', () => {
    const files = [...baseFiles(), { path: 'problems/discrete/broken.yaml', text: 'topics: [a\n' }];
    const { issues } = loadContentFromFiles(files);
    expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/broken.yaml', field: '(file)' }));
  });

  describe('問題スキーマ', () => {
    const withProblem = (text: string) => [...baseFiles(), { path: 'problems/discrete/p.yaml', text }];

    it('所属分野が1件以上必要', () => {
      const { issues } = loadContentFromFiles(withProblem(numericProblem.replace('topics: [discrete]', 'topics: []')));
      expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/p.yaml', field: 'topics' }));
    });

    it('選択式は正答の選択肢がちょうど1つ必要', () => {
      const text = choiceProblem.replace('{ id: b, text: B, correct: false }', '{ id: b, text: B, correct: true }');
      const { issues } = loadContentFromFiles(withProblem(text));
      expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/p.yaml', field: 'choices' }));
    });

    it('選択式には選択肢が必要', () => {
      const text = choiceProblem.split('choices:')[0] ?? '';
      const { issues } = loadContentFromFiles(withProblem(text));
      expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/p.yaml', field: 'choices' }));
    });

    it('数値入力式には正答が必要', () => {
      const { issues } = loadContentFromFiles(withProblem(numericProblem.replace('answer: n * 0.5', '')));
      expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/p.yaml', field: 'answer' }));
    });

    it('出典は original または reference（年度・問番号）のみ', () => {
      const text = numericProblem.replace('source: { kind: original }', 'source: { kind: copied }');
      const { issues } = loadContentFromFiles(withProblem(text));
      expect(issues).toContainEqual(expect.objectContaining({ file: 'problems/discrete/p.yaml', field: 'source.kind' }));
    });

    it('パラメータ範囲は min <= max かつ step > 0', () => {
      const text = numericProblem.replace('{ min: 10, max: 20, step: 2 }', '{ min: 30, max: 20, step: 0 }');
      const { issues } = loadContentFromFiles(withProblem(text));
      expect(issues.filter((i) => i.file === 'problems/discrete/p.yaml').map((i) => i.field)).toEqual(
        expect.arrayContaining(['params.n']),
      );
    });

    it('類題数の上限は50', () => {
      const { issues } = loadContentFromFiles(withProblem(`${numericProblem}\nvariants: 80\n`));
      expect(issues).toContainEqual(expect.objectContaining({ field: 'variants' }));
    });
  });
});
