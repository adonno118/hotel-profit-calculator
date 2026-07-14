import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../public/', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const redirects = new Map(
  (await readFile(join(root, '_redirects'), 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => {
    const [source, destination, status] = line.trim().split(/\s+/);
    return [source, { destination, status: Number(status) }];
  })
);
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const redirect = redirects.get(pathname);
    if (redirect) {
      response.writeHead(redirect.status, { location: redirect.destination, 'cache-control': 'no-store' });
      response.end();
      return;
    }
    const relative = pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '')}${extname(pathname) ? '' : '.html'}`;
    const file = normalize(join(root, relative));
    if (!file.startsWith(normalize(root))) throw new Error('invalid path');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('http://127.0.0.1:4173'));
