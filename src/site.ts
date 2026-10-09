import { resolve } from 'node:path';
import { buildSite, type Site } from '../build/site/site';

let cached: Site | undefined;

/** ビルド時に一度だけコンテンツを検証・変換して共有する（Astro のページから利用） */
export function getSite(): Site {
  cached ??= buildSite(resolve(process.env.CONTENT_DIR ?? 'content'), import.meta.env.BASE_URL);
  return cached;
}
