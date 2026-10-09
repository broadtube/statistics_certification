const PLACEHOLDER = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

export interface FillOptions {
  escapeHtml?: boolean;
  /** 未定義の記号: 'empty'（空文字に置換）/ 'throw'（例外） */
  onMissing?: 'empty' | 'throw';
}

/** {{name}} を values の値で置換する */
export function fillPlaceholders(text: string, values: Readonly<Record<string, string>>, opts: FillOptions = {}): string {
  return text.replace(PLACEHOLDER, (_m, name: string) => {
    const v = values[name];
    if (v === undefined) {
      if (opts.onMissing === 'throw') throw new Error(`差し込み記号 {{${name}}} の値がありません`);
      return '';
    }
    return opts.escapeHtml ? escapeHtml(v) : v;
  });
}
