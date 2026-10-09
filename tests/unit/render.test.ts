import { describe, expect, it } from 'vitest';
import { createRenderer, type LinkResolver } from '../../build/content/render';

const resolver: LinkResolver = (kind, id) => {
  const table: Record<string, { href: string; title: string }> = {
    'topic:regression': { href: '/sp/topics/regression/', title: '回帰分析' },
    'formula:ols': { href: '/sp/formulas/ols/', title: '最小二乗推定量' },
    'dist:normal': { href: '/sp/distributions/normal/', title: '正規分布' },
  };
  return table[`${kind}:${id}`];
};

const r = createRenderer(resolver);

describe('静的ページ用変換', () => {
  it('インライン数式をビルド時にKaTeXでHTML化する', () => {
    const html = r.render('分散は $\\sigma^2$ です', 'static');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('data-tex');
  });

  it('ディスプレイ数式を変換する', () => {
    const html = r.render('$$\n\\bar{X} = \\frac{1}{n}\\sum X_i\n$$', 'static');
    expect(html).toContain('katex-display');
  });

  it('不正なLaTeXはエラーにする', () => {
    expect(() => r.render('$\\frac{1}{$', 'static')).toThrow(/LaTeX/);
  });

  it('GFMの表を変換する', () => {
    const html = r.render('| a | b |\n|---|---|\n| 1 | 2 |', 'static');
    expect(html).toContain('<table>');
  });

  it('生のHTMLは出力しない', () => {
    const html = r.render('<script>alert(1)</script>本文', 'static');
    expect(html).not.toContain('<script>');
  });

  it('公式本体のLaTeXを単独で描画する', () => {
    expect(r.renderTex('E[X]=np', true)).toContain('katex-display');
  });
});

describe('問題用（テンプレート）変換', () => {
  it('数式をLaTeX文字列のまま保持し、差し込み記号を温存する', () => {
    const html = r.render('$B({{n}}, 0.5)$ に従う。試行回数は {{n}} 回。', 'template');
    expect(html).toContain('data-tex="B({{n}}, 0.5)"');
    expect(html).toContain('試行回数は {{n}} 回');
    expect(html).not.toContain('class="katex"');
  });

  it('ディスプレイ数式は display 指定付きで保持する', () => {
    const html = r.render('$$\n\\hat\\beta = {{b}}\n$$', 'template');
    expect(html).toMatch(/<div class="tex" data-tex="\\hat\\beta = \{\{b\}\}" data-display="true">/);
  });

  it('属性値中の引用符などをエスケープする', () => {
    const html = r.render('$a"b$', 'template');
    expect(html).toContain('data-tex="a&#x22;b"');
  });
});

describe('内部リンク', () => {
  it('参照先のタイトルを既定の表示名としてリンクに変換する', () => {
    const html = r.render('[[topic:regression]] を参照', 'static');
    expect(html).toContain('<a href="/sp/topics/regression/">回帰分析</a>');
  });

  it('表示名を指定できる', () => {
    const html = r.render('[[formula:ols|OLS]]と[[dist:normal]]', 'template');
    expect(html).toContain('<a href="/sp/formulas/ols/">OLS</a>');
    expect(html).toContain('<a href="/sp/distributions/normal/">正規分布</a>');
  });

  it('解決できないリンクはエラーにする', () => {
    expect(() => r.render('[[topic:ghost]]', 'static')).toThrow(/ghost/);
  });
});
