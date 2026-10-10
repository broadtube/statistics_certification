// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * ビルド後、`<meta name="preload-modules" content="app katex">` を置いたページに、指定チャンクの
 * `<link rel="modulepreload">` を差し込む。アイランドの import の連鎖を待たずに取得を始めるため（要件15.5）。
 * チャンク名はハッシュ付きでビルド時にしか決まらないので、ここで解決する。
 * @returns {import('astro').AstroIntegration}
 */
function preloadModules() {
  return {
    name: 'preload-modules',
    hooks: {
      'astro:build:done': async ({ dir, pages }) => {
        const root = fileURLToPath(dir);
        const chunks = (await readdir(`${root}_astro`)).filter((f) => f.endsWith('.js'));
        const marker = /<meta name="preload-modules" content="([^"]*)"\s*\/?>/;
        for (const { pathname } of pages) {
          const file = `${root}${pathname}index.html`;
          const html = await readFile(file, 'utf8').catch(() => null);
          const m = html?.match(marker);
          if (!html || !m) continue;
          const links = (m[1] ?? '').split(/\s+/).filter(Boolean).map((name) => {
            const chunk = chunks.find((f) => f.startsWith(`${name}.`));
            if (!chunk) throw new Error(`preload-modules: チャンク「${name}」が見つかりません`);
            return `<link rel="modulepreload" href="${base.replace(/\/?$/, '/')}_astro/${chunk}">`;
          });
          await writeFile(file, html.replace(marker, links.join('')));
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
  integrations: [preact(), preloadModules()],
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
