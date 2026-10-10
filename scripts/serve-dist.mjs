// ビルド成果物（dist/）をサブパス配下で配信する最小限の静的サーバー（E2E テスト用）。
// GitHub Pages と同様に、存在しないパスには 404.html を返し、テキスト系は gzip 圧縮して返す
// （Lighthouse の計測を本番の転送量に近づけるため）。
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const base = process.env.SITE_BASE ?? '/';
const port = Number(process.env.PORT ?? 4322);
const root = join(process.cwd(), 'dist');
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.ttf']);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (!path.startsWith(base)) path = '/__not_found__';
  else path = `/${path.slice(base.length)}`;
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) file = join(root, '__not_found__');
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  let status = 200;
  if (!existsSync(file)) {
    status = 404;
    file = join(root, '404.html');
  }
  const ext = extname(file);
  const headers = { 'content-type': types[ext] ?? 'application/octet-stream' };
  const gzip = compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gzip) Object.assign(headers, { 'content-encoding': 'gzip', vary: 'Accept-Encoding' });
  res.writeHead(status, headers);
  const body = createReadStream(file);
  (gzip ? body.pipe(createGzip()) : body).pipe(res);
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${base}`));
