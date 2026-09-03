// Запуск тестов активного этапа.
//
//   npm test            текущая Story и всё пройденное до неё
//   npm run test:all    весь набор целиком (проверка регрессии, §7.4)

import { spawnSync } from 'node:child_process';
import { ROOT, STAGES, readState, openStages, testFiles, activeIndex } from './stages.mjs';

const all = process.argv.includes('--all');
const state = readState();
const stages = all ? STAGES : openStages(state);
const files = testFiles(stages);

const active = STAGES[activeIndex(state)];
const hidden = STAGES.length - stages.length;

if (all) {
  console.log('Полный набор: все этапы мастер-класса.\n');
} else {
  console.log(`Активный этап: ${active.title}`);
  console.log(`Story: ${active.doc}`);
  if (hidden > 0) {
    console.log(
      `Скрыто этапов впереди: ${hidden}. Их тесты не запускаются — ` +
        'откройте следующий через npm run story:next.',
    );
  }
  console.log('Весь набор целиком: npm run test:all\n');
}

if (files.length === 0) {
  console.error('Не найдено ни одного тест-файла для активного этапа.');
  process.exit(1);
}

const res = spawnSync(process.execPath, ['--test', ...files], { cwd: ROOT, stdio: 'inherit' });
process.exit(res.status ?? 1);
