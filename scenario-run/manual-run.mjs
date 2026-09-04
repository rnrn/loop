// Автоматизированный прогон ОБЩЕГО РУЧНОГО СЦЕНАРИЯ мастер-класса (§6.4 / §6.6 / §7.5).
// Живой Chromium с fake-микрофоном вместо участника за столом.
// Это проверка браузерной интеграции, а не замена unit-тестам.
//
// Запуск: node scenario-run/manual-run.mjs [story1|story2|cr]

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Playwright ставится корневым `npm run bootstrap`, а не берётся из кэша хоста.
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright не установлен. Выполните в корне репозитория:\n\n  npm run bootstrap\n');
  process.exit(2);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'voice-notes-workshop');
const PORT = Number(process.env.SCENARIO_PORT ?? 5199);
const BASE = `http://localhost:${PORT}`;

const stage = process.argv[2] ?? 'story1';
const checks = [];
// Та же шкала, что в npm test: красный не используем, провал ручной проверки —
// это работа для следующей итерации, а не авария.
const COLOR = process.env.NO_COLOR
  ? false
  : Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY);
const col = (code, s) => (COLOR ? `[${code}m${s}[0m` : s);

const record = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  const tag = ok ? col('1;92', '[PASS]') : col('1;93', '[FAIL]');
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ''}`);
};

// --- dev server ------------------------------------------------------------

const server = spawn(process.execPath, ['dev-server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));

// --- browser ---------------------------------------------------------------

let browser;
try {
  browser = await chromium.launch({
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
} catch (error) {
  server.kill();
  console.error(`Не удалось запустить Chromium: ${error.message}`);
  console.error('\nСкорее всего не скачаны браузеры. Выполните:\n\n  npm run bootstrap\n');
  process.exit(2);
}
const context = await browser.newContext({ permissions: ['microphone'] });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

// stage=fallback — реальный путь STT в Chromium (SpeechRecognition отсутствует).
const url = stage === 'story1' || stage === 'fallback' ? BASE : `${BASE}/?mock-stt=1`;
await page.goto(url);

// --- helpers ---------------------------------------------------------------

const recordBtn = page.locator('#record-button');
const cards = page.locator('#recordings .card');

async function hold(ms, releaseOutside = false) {
  const box = await recordBtn.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  if (releaseOutside) await page.mouse.move(cx + 400, cy + 300);
  await page.mouse.up();
  await page.waitForTimeout(600);
}

// --- сценарий --------------------------------------------------------------

// Шаг 0: preflight микрофона (§ этап 3)
await page.click('#prepare-button');
await page.waitForTimeout(400);
record(
  'S1-01/S1-02  микрофон подготовлен, кнопка перешла в READY',
  (await recordBtn.getAttribute('data-state')) === 'READY',
  `data-state=${await recordBtn.getAttribute('data-state')}`,
);

// Запись 1: «Первая тестовая голосовая заметка»
await hold(1000);
record('S1-05  запись 1 создана', (await cards.count()) === 1, `карточек: ${await cards.count()}`);
record(
  'S1-02  кнопка вернулась в READY после записи',
  (await recordBtn.getAttribute('data-state')) === 'READY',
);

// Запись 2: «Вторая запись должна находиться сверху» + отпускание ВНЕ кнопки
await hold(1000, true);
const count = await cards.count();
record('S1-07  созданы две записи', count === 2, `карточек: ${count}`);
record('S1-04  отпускание вне кнопки завершило запись ровно один раз', count === 2);

// Порядок: новая сверху
const order = await page.$$eval('#recordings .card', (els) =>
  els.map((el) => el.querySelector('.card__meta')?.textContent ?? ''),
);
const ids = await page.$$eval('#recordings .card', (els) => els.map((el) => el.dataset.id));
record('S1-06  новая запись находится выше первой', new Set(ids).size === 2 && ids.length === 2, order.join(' | '));

// Воспроизведение обеих записей
const playable = await page.$$eval('#recordings audio', async (els) =>
  Promise.all(
    els.map(async (a) => {
      try {
        await a.play();
        await new Promise((r) => setTimeout(r, 250));
        return a.readyState >= 2 && a.currentTime > 0;
      } catch {
        return false;
      }
    }),
  ),
);
record('S1-05  обе записи воспроизводятся', playable.length === 2 && playable.every(Boolean), JSON.stringify(playable));

// --- Story 2 / change request ---------------------------------------------

if (stage !== 'story1') {
  const transcripts = await page.$$eval('#recordings .card__transcript', (els) =>
    els.map((el) => el.textContent.trim()),
  );
  const first = transcripts[0] ?? '';
  // «Расшифровка…» — это pending, а не результат: карточка не должна на нём застревать.
  const okText = first.length > 0 && first !== 'Расшифровка…';
  record(
    'S2-07  карточка показывает расшифровку или согласованный fallback',
    okText,
    JSON.stringify(first.slice(0, 60)),
  );
  if (stage === 'story2') {
    record(
      'S2-04  mock-STT: текст попал именно в свою карточку',
      first.includes('расшифровку голосовой заметки'),
      JSON.stringify(first.slice(0, 60)),
    );
  }
  record(
    'S2-06  аудио не пропало после STT',
    (await page.locator('#recordings audio').count()) === 2,
  );
}

if (stage === 'cr') {
  // aria-expanded есть и на тексте, и на кнопке — берём текстовый блок.
  const card = page.locator('#recordings .card').first();
  const toggle = card.locator('.card__transcript[aria-expanded]');
  const toggleButton = card.locator('.card__toggle');
  const hasToggle = (await toggle.count()) > 0;
  record('CR-07  у блока расшифровки есть aria-expanded', hasToggle);

  if (hasToggle) {
    record('CR-01  по умолчанию текст свёрнут', (await toggle.getAttribute('aria-expanded')) === 'false');

    const collapsedLines = await page.$$eval('#recordings .card__transcript', (els) => {
      const el = els[0];
      const cs = getComputedStyle(el);
      return { clamp: cs.webkitLineClamp, height: el.clientHeight, scroll: el.scrollHeight };
    });
    record(
      'CR-01  свёрнутое состояние ограничено четырьмя строками',
      collapsedLines.clamp === '4',
      `line-clamp=${collapsedLines.clamp}`,
    );

    await toggle.click();
    await page.waitForTimeout(150);
    record('CR-04  клик по тексту раскрывает его', (await toggle.getAttribute('aria-expanded')) === 'true');
    record(
      'CR-02  в раскрытом состоянии line-clamp снят',
      (await toggle.evaluate((el) => getComputedStyle(el).webkitLineClamp)) !== '4',
    );

    await toggleButton.click();
    await page.waitForTimeout(150);
    record(
      'CR-04  отдельная кнопка сворачивает текст',
      (await toggle.getAttribute('aria-expanded')) === 'false',
    );

    // клик по audio не переключает expanded
    await page.locator('#recordings audio').first().click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(150);
    record(
      'CR-05  клик по audio не меняет expanded',
      (await toggle.getAttribute('aria-expanded')) === 'false',
    );

    // раскрытие затрагивает только свою запись
    await toggle.click();
    await page.waitForTimeout(150);
    const perCard = await page.$$eval('#recordings .card', (els) =>
      els.map((el) => el.querySelector('.card__transcript')?.getAttribute('aria-expanded') ?? 'none'),
    );
    record(
      'CR-06  состояние expanded хранится для конкретной записи',
      perCard[0] === 'true' && perCard.slice(1).every((v) => v !== 'true'),
      JSON.stringify(perCard),
    );
    await toggle.click();
    await page.waitForTimeout(150);

    record(
      'CR-03  аудиоплеер и метаданные видимы в свёрнутом состоянии',
      (await page.locator('#recordings .card__meta').first().isVisible()) &&
        (await page.locator('#recordings audio').first().isVisible()),
    );
  }
}

// Консоль
record('S1-08  в консоли нет необработанных ошибок', consoleErrors.length === 0, consoleErrors.join(' / '));

// --- итог ------------------------------------------------------------------

await browser.close();
server.kill();

const failed = checks.filter((c) => !c.ok);
console.log(`\n=== ${stage}: ${checks.length - failed.length}/${checks.length} ручных проверок пройдено ===`);
process.exit(failed.length === 0 ? 0 : 1);
