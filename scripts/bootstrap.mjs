// Развёртывание проекта после `git clone`.
//
//   npm run bootstrap                 полная установка + самопроверка
//   npm run bootstrap -- --skip-browsers   без скачивания Chromium (~150 МБ)
//   npm run bootstrap -- --quick           без финальной самопроверки
//
// Сам мастер-класс зависимостей не имеет: npm-пакеты нужны только
// для автопрогона ручного сценария в браузере.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, WORKSHOP, CHECKPOINTS, CHECKPOINT_NAMES, NPM,
  run, testCounts, nodeMajor, ok, fail, soft, warn, info, step,
} from './shared.mjs';

const args = process.argv.slice(2);
const skipBrowsers = args.includes('--skip-browsers');
const quick = args.includes('--quick');
let problems = 0;

// --- 1. окружение ----------------------------------------------------------

step('1/5  Окружение');

if (nodeMajor() >= 20) {
  ok(`Node.js ${process.versions.node}`);
} else {
  fail(`Node.js ${process.versions.node} — нужен >= 20 (используются node:test и --test с glob)`);
  info('Обновите Node.js и повторите: https://nodejs.org/');
  process.exit(1);
}

const npmVersion = run(NPM, ['--version'], { stdio: 'pipe' });
if (npmVersion.status === 0) ok(`npm ${npmVersion.stdout.trim()}`);
else {
  fail('npm недоступен');
  process.exit(1);
}

// --- 2. целостность репозитория -------------------------------------------

step('2/5  Структура репозитория');

const REQUIRED = [
  'voice-notes-workshop/AGENTS.md',
  'voice-notes-workshop/SPEC.md',
  'voice-notes-workshop/LOOP.md',
  'voice-notes-workshop/progress.md',
  'voice-notes-workshop/package.json',
  'voice-notes-workshop/index.html',
  'voice-notes-workshop/styles.css',
  'voice-notes-workshop/dev-server.js',
  'voice-notes-workshop/stories/1-record-audio.md',
  'voice-notes-workshop/stories/2-add-transcription.md',
  'voice-notes-workshop/change-requests/1-collapse-long-transcripts.md',
  'voice-notes-workshop/src/app.js',
  'voice-notes-workshop/src/recording.js',
  'voice-notes-workshop/src/recordings-store.js',
  'voice-notes-workshop/src/speech-recognition.js',
  'voice-notes-workshop/tests/recordings-store.test.js',
  'voice-notes-workshop/tests/speech-recognition.test.js',
  'voice-notes-workshop/tests/collapse-transcript.test.js',
  'voice-notes-workshop/tools/stages.mjs',
  'voice-notes-workshop/tools/test.mjs',
  'voice-notes-workshop/tools/story.mjs',
  'scenario-run/manual-run.mjs',
];

const missing = REQUIRED.filter((rel) => !existsSync(join(ROOT, rel)));
if (missing.length === 0) {
  ok(`Все ${REQUIRED.length} обязательных файлов на месте (структура §3.6)`);
} else {
  fail(`Не хватает файлов: ${missing.length}`);
  missing.forEach((m) => info(m));
  problems += 1;
}

const presentCheckpoints = CHECKPOINT_NAMES.filter((n) => existsSync(join(CHECKPOINTS, n)));
if (presentCheckpoints.length === CHECKPOINT_NAMES.length) {
  ok(`Чекпоинты §8.2: ${presentCheckpoints.length}/4`);
} else {
  warn(`Чекпоинтов найдено ${presentCheckpoints.length}/4 — резервные сценарии будут недоступны`);
  CHECKPOINT_NAMES.filter((n) => !presentCheckpoints.includes(n)).forEach((n) => info(`нет: ${n}`));
}

// --- 3. зависимости --------------------------------------------------------

step('3/5  Зависимости прогона сценария');

const install = run(NPM, ['install', '--no-audit', '--no-fund'], { stdio: 'inherit' });
if (install.status === 0) {
  ok('npm install выполнен (playwright)');
} else {
  // Некритично: занятие проводится и без этих пакетов.
  soft('npm install завершился с ошибкой');
  info('Если машина без интернета — сценарий в браузере будет недоступен,');
  info('но сам мастер-класс работает: npm run dev и npm test зависимостей не требуют.');
}

// --- 4. браузер ------------------------------------------------------------

step('4/5  Chromium для ручного сценария');

if (skipBrowsers) {
  warn('Пропущено по флагу --skip-browsers');
  info('Позже: npx playwright install chromium');
} else if (install.status !== 0) {
  warn('Пропущено: playwright не установлен');
} else {
  const browsers = run(NPM, ['exec', '--', 'playwright', 'install', 'chromium'], { stdio: 'inherit' });
  if (browsers.status === 0) ok('Chromium установлен');
  else {
    warn('Не удалось скачать Chromium');
    info('Повторите вручную: npx playwright install chromium');
    problems += 1;
  }
}

// --- 5. самопроверка -------------------------------------------------------

step('5/5  Самопроверка');

if (quick) {
  warn('Пропущено по флагу --quick');
} else {
  const workshop = testCounts(WORKSHOP);
  if (workshop.fail === 0 && workshop.pass > 0) {
    ok(`Рабочее дерево: npm test → ${workshop.pass}/${workshop.tests}`);
  } else {
    fail(`Рабочее дерево: npm test → pass ${workshop.pass}, fail ${workshop.fail}`);
    problems += 1;
  }

  const startCp = join(CHECKPOINTS, 'checkpoint-00-start');
  if (existsSync(startCp)) {
    const start = testCounts(startCp);
    // Стартовое состояние ОБЯЗАНО быть красным ровно по Story 1:
    // участник видит FAIL своей задачи, а не всего курса.
    if (start.pass === 0 && start.fail === 9 && start.tests === 9) {
      ok(`checkpoint-00-start красный ровно по Story 1: fail ${start.fail}/${start.tests}`);
    } else {
      fail(
        `checkpoint-00-start не в стартовом состоянии: pass ${start.pass}, fail ${start.fail}, всего ${start.tests} (ожидалось 0/9)`,
      );
      problems += 1;
    }
  }
}

// --- итог ------------------------------------------------------------------

step(problems === 0 ? 'Готово' : `Готово с замечаниями: ${problems}`);

console.log(`
Дальше:

  npm run preflight          проверка окружения перед занятием (§8.1)
  npm run dev                http://localhost:5173/  (и /?mock-stt=1 — §7.6)
  npm test                   полный набор тестов
  npm run scenario:all       прогон ручного сценария в браузере, все 4 ветки
  npm run verify             тесты + все чекпоинты + все ветки сценария

  npm run checkpoint -- list           список чекпоинтов
  npm run checkpoint -- 00 --force     откатить рабочее дерево на стартовое состояние
`);

process.exit(problems === 0 ? 0 : 1);
