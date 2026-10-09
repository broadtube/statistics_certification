// ビルド成果物（dist/）をサブパス配下で配信する最小限の静的サーバー（E2E テスト用）。
// GitHub Pages と同様に、存在しないパスには 404.html を返す。
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const base = process.env.SITE_BASE ?? '/';
const port = Number(process.env.PORT ?? 4322);
const root = join(process.cwd(), 'dist');
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
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': types['.html'] });
    createReadStream(join(root, '404.html')).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${base}`));
