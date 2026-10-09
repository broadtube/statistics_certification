/** base（例: "/stats-pre1/"）と相対パスを結合し、サブパス配下でも解決できるURLを返す */
export function joinBase(base: string, path: string): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${b}${p}`;
}

/** 実行時（Astro / ブラウザ）の base に対してパスを解決する */
export function url(path: string): string {
  return joinBase(import.meta.env.BASE_URL ?? '/', path);
}
