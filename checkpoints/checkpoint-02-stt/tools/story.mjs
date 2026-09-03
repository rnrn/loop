// Управление текущей Story — инструмент модератора (§2.3, §6.8).
//
//   npm run story              где мы сейчас
//   npm run story:next         открыть следующий этап
//   npm run story:set story-2  перейти на конкретный этап
//   npm run story:reset        вернуться к Story 1

import { STAGES, readState, writeState, activeIndex, FIRST_STAGE } from './stages.mjs';

const [command, ...rest] = process.argv.slice(2);
const state = readState();
const index = activeIndex(state);

function show(currentIndex) {
  console.log('\nЭтапы мастер-класса:\n');
  STAGES.forEach((stage, i) => {
    const mark = i < currentIndex ? '[x]' : i === currentIndex ? '[>]' : '[ ]';
    const note = i > currentIndex ? '  (закрыт, тесты не запускаются)' : '';
    const opt = stage.optional ? '  (опционально)' : '';
    console.log(`  ${mark} ${stage.title}${opt}${note}`);
  });
  console.log(`\nТесты сейчас: этапы 1–${currentIndex + 1} из ${STAGES.length}`);
  console.log('  npm test            проверить активный этап');
  console.log('  npm run test:all    весь набор целиком');
  if (currentIndex < STAGES.length - 1) {
    console.log('  npm run story:next  открыть следующий этап\n');
  } else {
    console.log('');
  }
}

if (!command || command === 'status') {
  show(index);
  process.exit(0);
}

if (command === 'next') {
  if (index >= STAGES.length - 1) {
    console.log('Это последний этап — открывать больше нечего.');
    show(index);
    process.exit(0);
  }
  const next = STAGES[index + 1];
  writeState(next.id);
  console.log(`Открыт этап: ${next.title}`);
  console.log(`Прочитайте: ${next.doc}`);
  console.log('Запустите npm test — вы должны увидеть FAIL нового этапа.');
  show(index + 1);
  process.exit(0);
}

if (command === 'reset') {
  writeState(FIRST_STAGE);
  console.log('Возврат к первому этапу.');
  show(0);
  process.exit(0);
}

if (command === 'set') {
  const id = rest.find((a) => !a.startsWith('--'));
  const target = STAGES.findIndex((s) => s.id === id);
  if (target === -1) {
    console.error(`Неизвестный этап: ${id ?? '(не указан)'}`);
    console.error(`Доступны: ${STAGES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }
  writeState(id);
  console.log(`Активный этап: ${STAGES[target].title}`);
  show(target);
  process.exit(0);
}

console.error(`Неизвестная команда: ${command}`);
console.error('Доступно: status | next | set <id> | reset');
process.exit(1);
