import { resolve } from 'node:path';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../../build/site/site';
import { renderProblem } from '../../src/lib/render/problem';

describe('ビルド時の変換 → ブラウザ側の描画', () => {
  it('全問題・全類題で差し込み記号と未描画の数式が残らない', () => {
    const site = buildSite(resolve(__dirname, '../fixtures/content-ok'), '/');
    for (const bank of site.problemBank.banks.values()) {
      for (const p of bank.problems) {
        p.variants.forEach((v, i) => {
          const r = renderProblem(p, i, null, katex);
          const all = [r.statementHtml, r.explanationHtml, ...(r.choices ?? []).map((c) => c.html)].join('\n');
          expect(all).not.toMatch(/\{\{/);
          expect(all).not.toContain('data-tex');
          expect(all).toContain('class="katex"');
          expect(r.answerDisplay).toBe(v.values.answer);
        });
      }
    }
  });
});
