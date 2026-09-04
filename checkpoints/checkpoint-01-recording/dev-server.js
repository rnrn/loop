// Минимальный статический dev-сервер без внешних зависимостей.
// Нужен потому, что getUserMedia и модули не работают из file:// (см. §8.3).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT ?? 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Браузер сам просит favicon. Без ответа он пишет 404 в консоль, а участник
  // по ручному сценарию должен видеть консоль чистой (§7.5).
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ''));

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': TYPES[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
});

server.listen(PORT, () => {
  console.log(`dev server:  http://localhost:${PORT}/`);
  console.log(`mock STT:    http://localhost:${PORT}/?mock-stt=1`);
});
