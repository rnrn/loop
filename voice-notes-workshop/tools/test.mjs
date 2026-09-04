// Запуск тестов активного этапа.
//
//   npm test            текущая Story и всё пройденное до неё
//   npm run test:all    весь набор целиком (проверка регрессии, §7.4)
//   npm test -- --color оставить собственную раскраску node:test

import { spawnSync } from 'node:child_process';
import { ROOT, STAGES, readState, openStages, testFiles, activeIndex } from './stages.mjs';

// Цвет: красный не используем. В этом курсе падение теста — штатное событие,
// с него начинается цикл; пугать им участника неправильно.
const COLOR = !process.env.NO_COLOR;
const c = (code) => (COLOR ? `[${code}m` : '');
const RESET = c(0);
const GREEN = c('1;92');
const YELLOW = c('1;93');
const DIM = c(2);

const argv = process.argv.slice(2);
const all = argv.includes('--all');
const keepNodeColor = argv.includes('--color');

const state = readState();
const stages = all ? STAGES : openStages(state);
const files = testFiles(stages);

const active = STAGES[activeIndex(state)];
const hidden = STAGES.length - stages.length;

if (all) {
  console.log(`${DIM}Полный набор: все этапы мастер-класса.${RESET}\n`);
} else {
  console.log(`Активный этап: ${active.title}`);
  console.log(`${DIM}Story: ${active.doc}${RESET}`);
  if (hidden > 0) {
    console.log(
      `${DIM}Скрыто этапов впереди: ${hidden}. Их тесты не запускаются — ` +
        `откройте следующий через npm run story:next.${RESET}`,
    );
  }
  console.log(`${DIM}Весь набор целиком: npm run test:all${RESET}\n`);
}

if (files.length === 0) {
  console.error('Не найдено ни одного тест-файла для активного этапа.');
  process.exit(1);
}

// node:test красит провалы красным. Гасим — вердикт ниже говорит понятнее.
const env = { ...process.env };
if (!keepNodeColor) env.NO_COLOR = '1';

const res = spawnSync(process.execPath, ['--test', ...files], { cwd: ROOT, stdio: 'inherit', env });
const failed = (res.status ?? 1) !== 0;

console.log('');
if (!failed) {
  console.log(`${GREEN}PASS${RESET} — этап «${active.title}» проходит автоматическую проверку.`);
  console.log(`${DIM}Дальше по циклу: ручной сценарий, затем evidence в progress.md (LOOP.md, шаг 7).${RESET}`);
} else {
  console.log(`${YELLOW}FAIL${RESET} — тесты активного этапа не проходят.`);
  console.log('');
  console.log(`${DIM}Это нормальное состояние, пока Story не реализована: цикл и начинается с FAIL.${RESET}`);
  console.log(`${DIM}Ошибка выше — не поломка курса, а вход в следующую итерацию (LOOP.md, шаг 2).${RESET}`);
  console.log(`${DIM}Прочитайте конкретную ошибку, найдите причину, исправьте её, повторите проверку.${RESET}`);
  console.log(`${DIM}Тесты при этом не трогаем: ослаблять их ради зелёного запрещено.${RESET}`);
}

process.exit(res.status ?? 1);
