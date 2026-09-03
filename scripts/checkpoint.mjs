// Резервные сценарии мастер-класса (§8.2, §8.3).
// Переключает рабочее дерево на подготовленное состояние, когда участник
// упёрся в BLOCKED / RETRY_LIMIT / TIMEBOX_EXPIRED и должен продолжить с группой.
//
//   npm run checkpoint -- list
//   npm run checkpoint -- 01              покажет, что будет перезаписано
//   npm run checkpoint -- 01 --force      выполнит откат
//   npm run checkpoint -- save my-state   снимок текущего дерева

import { cpSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHECKPOINTS, WORKSHOP, CHECKPOINT_NAMES, ok, fail, warn, info, step } from './shared.mjs';

const [command, ...rest] = process.argv.slice(2);
const force = rest.includes('--force') || process.argv.includes('--force');

function list() {
  step('Доступные чекпоинты');
  if (!existsSync(CHECKPOINTS)) {
    warn('Директории checkpoints/ нет');
    return;
  }
  for (const name of readdirSync(CHECKPOINTS)) {
    const known = CHECKPOINT_NAMES.includes(name);
    console.log(`  ${name}${known ? '' : '   (пользовательский)'}`);
  }
  console.log(`
Откат:   npm run checkpoint -- 01 --force
Снимок:  npm run checkpoint -- save имя-состояния`);
}

function resolveName(key) {
  if (CHECKPOINT_NAMES.includes(key)) return key;
  const byPrefix = CHECKPOINT_NAMES.find((n) => n.startsWith(`checkpoint-${key}`));
  if (byPrefix) return byPrefix;
  if (existsSync(join(CHECKPOINTS, key))) return key;
  return null;
}

if (!command || command === 'list') {
  list();
  process.exit(0);
}

if (command === 'save') {
  const name = rest.find((a) => !a.startsWith('--'));
  if (!name) {
    fail('Укажите имя: npm run checkpoint -- save имя-состояния');
    process.exit(1);
  }
  const target = join(CHECKPOINTS, name);
  if (existsSync(target) && !force) {
    fail(`${name} уже существует. Перезаписать: добавьте --force`);
    process.exit(1);
  }
  mkdirSync(CHECKPOINTS, { recursive: true });
  rmSync(target, { recursive: true, force: true });
  cpSync(WORKSHOP, target, { recursive: true });
  ok(`Снимок сохранён: checkpoints/${name}`);
  process.exit(0);
}

const name = resolveName(command);
if (!name) {
  fail(`Неизвестный чекпоинт: ${command}`);
  list();
  process.exit(1);
}

const source = join(CHECKPOINTS, name);

if (!force) {
  // Откат затирает работу участника — по умолчанию только показываем намерение.
  step('Предпросмотр (ничего не изменено)');
  info(`Источник:  checkpoints/${name}`);
  info('Цель:      voice-notes-workshop/  — будет ПОЛНОСТЬЮ заменена');
  warn('Несохранённая работа участника будет потеряна.');
  console.log(`
Сохранить текущее состояние перед откатом:
  npm run checkpoint -- save before-rollback

Выполнить откат:
  npm run checkpoint -- ${command} --force`);
  process.exit(0);
}

rmSync(WORKSHOP, { recursive: true, force: true });
cpSync(source, WORKSHOP, { recursive: true });
ok(`Рабочее дерево переключено на ${name}`);
info('Проверьте состояние: npm test');
