import katex from 'katex';
import type { Root as MdastRoot } from 'mdast';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { INTERNAL_LINK_RE } from './references';

export type RenderMode = 'static' | 'template';
export type LinkResolver = (kind: string, id: string) => { href: string; title: string } | undefined;

export const KATEX_OPTIONS = { strict: 'ignore', throwOnError: true } as const;

/** 問題テンプレート用: 数式ノードを <span class="tex" data-tex> / <div class="tex" data-tex> に置き換える */
function remarkTexPlaceholder() {
  return (tree: MdastRoot) => {
    visit(tree, (node) => {
      if (node.type === 'inlineMath' || node.type === 'math') {
        const display = node.type === 'math';
        node.data = {
          hName: display ? 'div' : 'span',
          hProperties: { className: ['tex'], dataTex: node.value, dataDisplay: String(display) },
          hChildren: [{ type: 'text', value: node.value }],
        };
      }
    });
  };
}

function escapeMdLabel(s: string): string {
  return s.replace(/[[\]\\]/g, (c) => `\\${c}`);
}

export interface ContentRenderer {
  render(markdown: string, mode: RenderMode): string;
  renderTex(tex: string, display: boolean): string;
  resolveLinks(markdown: string): string;
}

export function createRenderer(resolve: LinkResolver): ContentRenderer {
  const staticProc = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, KATEX_OPTIONS)
    .use(rehypeStringify);

  const templateProc = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkTexPlaceholder)
    .use(remarkRehype)
    .use(rehypeStringify, { characterReferences: { useNamedReferences: false } });

  function resolveLinks(markdown: string): string {
    return markdown.replace(INTERNAL_LINK_RE, (_m, kind: string, id: string, label: string | undefined) => {
      const target = resolve(kind, id.trim());
      if (!target) throw new Error(`内部リンクを解決できません: [[${kind}:${id}]]`);
      return `[${escapeMdLabel(label ?? target.title)}](${target.href})`;
    });
  }

  return {
    resolveLinks,
    render(markdown, mode) {
      const md = resolveLinks(markdown);
      const proc = mode === 'static' ? staticProc : templateProc;
      const file = proc.processSync(md);
      const katexErrors = file.messages.filter((m) => m.source === 'rehype-katex');
      if (katexErrors.length > 0) {
        throw new Error(`LaTeXの構文エラー: ${katexErrors.map((m) => m.reason).join(' / ')}\n--- 入力 ---\n${markdown}`);
      }
      return String(file).trim();
    },
    renderTex(tex, display) {
      try {
        return katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode: display });
      } catch (e) {
        throw new Error(`LaTeXの構文エラー: ${(e as Error).message}\n--- 入力 ---\n${tex}`);
      }
    },
  };
}
