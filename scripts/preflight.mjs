// Preflight модератора перед занятием (§8.1).
// Отвечает на вопрос: можно ли за этим ноутбуком провести мастер-класс.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, WORKSHOP, CHECKPOINTS, CHECKPOINT_NAMES, testCounts, nodeMajor, ok, fail, warn, info, step } from './shared.mjs';

let problems = 0;
const bad = (msg, hint) => {
  fail(msg);
  if (hint) info(hint);
  problems += 1;
};

step('Окружение');
nodeMajor() >= 20
  ? ok(`Node.js ${process.versions.node}`)
  : bad(`Node.js ${process.versions.node} — нужен >= 20`, 'https://nodejs.org/');

step('Порты');
for (const port of [5173, 5199]) {
  const free = await new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
  free
    ? ok(`Порт ${port} свободен`)
    : warn(`Порт ${port} занят — dev server или прогон сценария не стартуют`);
}

step('Материалы занятия');
const workshop = testCounts(WORKSHOP);
workshop.fail === 0 && workshop.pass > 0
  ? ok(`Рабочее дерево зелёное: ${workshop.pass}/${workshop.tests}`)
  : warn(`Рабочее дерево: pass ${workshop.pass}, fail ${workshop.fail} — это нормально, если вы в середине Story`);

const missingCp = CHECKPOINT_NAMES.filter((n) => !existsSync(join(CHECKPOINTS, n)));
missingCp.length === 0
  ? ok('Все 4 чекпоинта на месте — резервные сценарии доступны')
  : bad(`Нет чекпоинтов: ${missingCp.join(', ')}`, 'Без них нечем спасать отставшего участника (§8.3)');

step('Прогон сценария в браузере');
let pw = false;
try {
  await import('playwright');
  pw = true;
  ok('playwright установлен');
} catch {
  warn('playwright не установлен — автопрогон ручного сценария недоступен');
  info('npm run bootstrap');
}

if (pw) {
  const { chromium } = await import('playwright');
  try {
    const b = await chromium.launch();
    await b.close();
    ok('Chromium запускается');
  } catch {
    warn('Chromium не запускается');
    info('npx playwright install chromium');
  }
}

step('Ручные пункты — проверить глазами');
console.log(`
  [ ] Микрофон/гарнитура работают, разрешение выдаётся в выбранном браузере
  [ ] Coding agent установлен и авторизован
  [ ] Страница открывается ТОЛЬКО через npm run dev, не через file:// (§8.3)
  [ ] Проверен mock-режим: http://localhost:5173/?mock-stt=1
  [ ] Проектор: шрифт терминала, масштаб браузера, видны ошибка теста и diff
  [ ] В проекте только учебные данные, реальных рабочих сведений нет
`);

step(problems === 0 ? 'Автоматическая часть preflight пройдена' : `Проблем: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
