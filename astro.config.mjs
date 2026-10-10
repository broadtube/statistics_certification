// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * ビルド時に描画済みの数式（KaTeX の HTML）が使う書体。クラス名から判定する。
 * @type {[string, RegExp][]}
 */
const KATEX_FONTS = [
  ['Main-Regular', /class="katex"/],
  ['Math-Italic', /\bmathnormal\b/],
  ['Math-BoldItalic', /\bboldsymbol\b/],
  ['Main-Bold', /\bmathbf\b/],
  ['Main-Italic', /\bmathit\b/],
  ['AMS-Regular', /\b(amsrm|mathbb)\b/],
  ['Caligraphic-Regular', /\bmathcal\b/],
  ['Size1-Regular', /\bsize1\b/],
  ['Size2-Regular', /\b(size2|large-op)\b/],
  ['Size3-Regular', /\bsize3\b/],
  ['Size4-Regular', /\bsize4\b/],
];

/**
 * 数式のあるページで、先読みした KaTeX フォントがそろうまで本文を隠す（global.css の katex-fonts-pending）。
 * 先読みの完了後、初回描画で使われたフォントの読み込み（document.fonts.ready）も待つ。最長 2 秒で打ち切る。
 */
const FONT_GATE = `<script>(()=>{const d=document.documentElement,c='katex-fonts-pending',show=()=>d.classList.remove(c);d.classList.add(c);setTimeout(show,2000);const w=[...document.querySelectorAll('link[rel=preload][as=font]')].map(l=>performance.getEntriesByName(l.href).length?0:new Promise(r=>{l.onload=l.onerror=r}));Promise.all(w).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>document.fonts.ready.then(show))))})()</script>`;

/**
 * ビルド後に各ページの head へ先読みを差し込む（要件15.5）。ファイル名はハッシュ付きでビルド時にしか
 * 決まらないので、ここで解決する。
 * - `<meta name="preload-modules" content="app katex">` を置いたページ: 指定チャンクの modulepreload。
 *   アイランドの import の連鎖を待たずに取得を始める。
 * - ビルド時に描画済みの数式があるページ: 使っている KaTeX フォントの preload。フォントの到着が
 *   遅れて数式の寸法が変わり、本文がずれる（CLS）のを防ぐ。先読みだけでは初回描画との競争になるため、
 *   フォントがそろうまで本文を隠すスクリプト（FONT_GATE）も置く。
 * @returns {import('astro').AstroIntegration}
 */
function headPreloads() {
  return {
    name: 'head-preloads',
    hooks: {
      'astro:build:done': async ({ dir, pages }) => {
        const root = fileURLToPath(dir);
        const assets = await readdir(`${root}_astro`);
        const assetUrl = (/** @type {string} */ prefix, /** @type {string} */ ext) => {
          const file = assets.find((f) => f.startsWith(`${prefix}.`) && f.endsWith(ext));
          if (!file) throw new Error(`head-preloads: 「${prefix}*${ext}」が見つかりません`);
          return `${base.replace(/\/?$/, '/')}_astro/${file}`;
        };
        const marker = /<meta name="preload-modules" content="([^"]*)"\s*\/?>/;
        for (const { pathname } of pages) {
          const file = `${root}${pathname}index.html`;
          let html = await readFile(file, 'utf8').catch(() => null);
          if (!html) continue;
          const original = html;
          const m = html.match(marker);
          if (m) {
            const names = (m[1] ?? '').split(/\s+/).filter(Boolean);
            html = html.replace(marker, names.map((n) => `<link rel="modulepreload" href="${assetUrl(n, '.js')}">`).join(''));
          }
          const body = html.slice(html.indexOf('<body'));
          if (body.includes('class="katex"')) {
            // 小さいフォントは CSS に埋め込まれていて（Vite の assetsInlineLimit）ファイルが無いので対象外
            const fonts = KATEX_FONTS.filter(([name, re]) => re.test(body) && assets.some((f) => f.startsWith(`KaTeX_${name}.`) && f.endsWith('.woff2'))).map(
              ([name]) => `<link rel="preload" href="${assetUrl(`KaTeX_${name}`, '.woff2')}" as="font" type="font/woff2" crossorigin="anonymous">`,
            );
            // CSS より先に取得を始めるよう head の先頭（charset の直後）に置く
            if (fonts.length > 0) html = html.replace(/<meta charset="utf-8"\s*\/?>/, (m) => `${m}${fonts.join('')}${FONT_GATE}`);
          }
          if (html !== original) await writeFile(file, html);
        }
      },
    },
  };
}

const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://example.github.io',
  base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [preact(), headPreloads()],
  vite: {
    build: {
      rollupOptions: {
        output: {
          // 細かい共有チャンク（preact・学習記録・出題ロジック等）を1つにまとめ、アイランド起動時の
          // import の連鎖（往復回数）を減らす（要件15.5）。分布計算・KaTeX など大きいものは対象外。
          codeSplitting: {
            groups: [
              {
                name: 'app',
                test: /node_modules[\\/](preact|@preact)[\\/]|src[\\/](lib[\\/](client|storage|render|types)[\\/]|lib[\\/]domain[\\/](grader|planner|session|srs|stats|mock)\.ts$|lib[\\/][^\\/]+\.ts$|components[\\/](IslandBoundary|practice)[\\/.])/,
              },
            ],
          },
        },
      },
    },
  },
});
