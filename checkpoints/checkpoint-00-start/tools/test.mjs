// Запуск тестов активного этапа.
//
//   npm test            текущая Story и всё пройденное до неё
//   npm run test:all    весь набор целиком (проверка регрессии, §7.4)
//   npm test -- --color оставить собственную раскраску node:test (красный)

import { spawn } from 'node:child_process';
import { ROOT, STAGES, readState, openStages, testFiles, activeIndex, readCriteria, createColors } from './stages.mjs';

// Цвет: красный не используем. В этом курсе падение теста — штатное событие,
// с него начинается цикл. Но выделение упавших строк нужно, иначе взгляду
// не за что зацепиться, поэтому node:test не гасим, а перекрашиваем в жёлтый.
const { enabled: COLOR, reset: RESET, green: GREEN, yellow: YELLOW, dim: DIM } = createColors();

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

// Этап, который участник делает с нуля: молча зеленеть на чужих тестах нельзя.
if (!all && active.authoring) {
  const noStory = readCriteria(active) === null;
  const noGate = testFiles([active]).length === 0;

  if (noStory || noGate) {
    const what = noStory ? 'СПЕКИ НЕТ' : 'ГЕЙТА НЕТ';
    console.log(`${YELLOW}${what}${RESET} — этап «${active.title}» ещё не готов к проверке.`);
    console.log('');
    console.log(`${DIM}Story 1 шла с готовой спекой и готовыми тестами.${RESET}`);
    console.log(`${DIM}Здесь вы создаёте и то и другое — см. LOOP.md, «Откуда берутся тесты».${RESET}`);
    console.log('');
    console.log(`  ${noStory ? '→' : '✓'} 1. ${active.doc} — спека: критерии с кодами в таблице`);
    console.log(`  ${noStory || noGate ? '→' : '✓'} 2. ${active.tests.join(', ')} — гейт, отдельным проходом, без реализации`);
    console.log('    3. npm run gate — гейт обязан быть КРАСНЫМ');
    console.log('    4. человек читает тесты и замораживает их');
    console.log('    5. только теперь реализация');
    console.log('');
    console.log(`${DIM}Тест, который ни разу не падал, ничего не доказывает.${RESET}`);
    process.exit(2);
  }
}

if (files.length === 0) {
  console.error('Не найдено ни одного тест-файла для активного этапа.');
  process.exit(1);
}

const env = { ...process.env };
if (COLOR && !keepNodeColor) env.FORCE_COLOR = '1';

const child = spawn(process.execPath, ['--test', ...files], {
  cwd: ROOT,
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

/** Красный node:test → жёлтый. Символы ✖ и структура вывода сохраняются. */
const RED_SGR = /\[(?:0;)?(?:1;)?(?:31|91)m/g;
const recolor = (line) => (COLOR && !keepNodeColor ? line.replace(RED_SGR, YELLOW) : line);

/** Построчная буферизация: ANSI-последовательность не должна порваться между чанками. */
function pipeRecolored(source, sink) {
  let buffer = '';
  source.setEncoding('utf8');
  source.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) sink.write(`${recolor(line)}\n`);
  });
  source.on('end', () => {
    if (buffer) sink.write(recolor(buffer));
  });
}

pipeRecolored(child.stdout, process.stdout);
pipeRecolored(child.stderr, process.stderr);

child.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log(`${GREEN}PASS${RESET} — этап «${active.title}» проходит автоматическую проверку.`);
    console.log(`${DIM}Дальше по циклу: ручной сценарий, затем evidence в progress.md (LOOP.md, шаг 7).${RESET}`);
  } else {
    console.log(`${YELLOW}FAIL${RESET} — тесты активного этапа не проходят.`);
    console.log('');
    console.log(`${DIM}Это нормальное состояние, пока Story не реализована: цикл и начинается с FAIL.${RESET}`);
    console.log(`${DIM}Жёлтым выше отмечены упавшие проверки — это вход в следующую итерацию,${RESET}`);
    console.log(`${DIM}а не поломка курса (LOOP.md, шаг 2).${RESET}`);
    console.log(`${DIM}Прочитайте конкретную ошибку, найдите причину, исправьте её, повторите проверку.${RESET}`);
    console.log(`${DIM}Тесты при этом не трогаем: ослаблять их ради зелёного запрещено.${RESET}`);
  }
  process.exit(code ?? 1);
});
