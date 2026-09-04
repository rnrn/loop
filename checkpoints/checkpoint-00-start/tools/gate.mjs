// Проверка гейта перед реализацией.
//
//   npm run gate
//
// Отвечает на один вопрос: можно ли доверять этим тестам как проверке.
// Тест, который зелёный ещё до написания кода, гейтом не является —
// он либо проверяет не то, либо не проверяет ничего.

import { spawnSync } from 'node:child_process';
import { ROOT, STAGES, readState, activeIndex, testFiles, createColors } from './stages.mjs';

const { reset: RESET, green: GREEN, yellow: YELLOW, dim: DIM, bold: BOLD } = createColors();

const state = readState();
const active = STAGES[activeIndex(state)];
const files = testFiles([active]);

console.log(`${BOLD}Гейт этапа: ${active.title}${RESET}`);
console.log(`${DIM}${active.doc}${RESET}\n`);

if (files.length === 0) {
  console.log(`${YELLOW}ГЕЙТА НЕТ${RESET} — тесты этапа не написаны: ${active.tests.join(', ')}`);
  console.log(`${DIM}Напишите их по acceptance criteria, отдельным проходом, без реализации.${RESET}`);
  process.exit(2);
}

const res = spawnSync(process.execPath, ['--test', ...files], {
  cwd: ROOT,
  stdio: 'pipe',
  encoding: 'utf8',
});
const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.replace(/\[[0-9;]*m/g, '');
const num = (key) => {
  const m = out.match(new RegExp(`^\\u2139 ${key} (\\d+)$`, 'm'));
  return m ? Number(m[1]) : 0;
};
const tests = num('tests');
const failed = num('fail');
const passed = num('pass');

console.log(`Тестов: ${tests}   падает: ${failed}   проходит: ${passed}\n`);

if (tests === 0) {
  console.log(`${YELLOW}ГЕЙТ ПУСТОЙ${RESET} — файл есть, тестов в нём нет.`);
  process.exit(2);
}

if (failed === 0) {
  console.log(`${YELLOW}ГЕЙТ НЕ ДОКАЗАН${RESET} — все тесты зелёные ДО реализации.`);
  console.log('');
  console.log(`${DIM}Так выглядит тест, который подогнан под уже существующий код${RESET}`);
  console.log(`${DIM}или не проверяет ничего. Проверьте: тест обращается к функциям,${RESET}`);
  console.log(`${DIM}которых ещё нет? Он падает по нужной причине, а не по опечатке?${RESET}`);
  console.log('');
  console.log(`${DIM}Если реализация этапа уже написана — гейт проверять поздно:${RESET}`);
  console.log(`${DIM}его фиксируют ДО кода. Это и есть смысл первого FAIL.${RESET}`);
  process.exit(1);
}

console.log(`${GREEN}ГЕЙТ ЗАФИКСИРОВАН${RESET} — ${failed} из ${tests} проверок падают до реализации.`);
console.log('');
console.log(`${DIM}Теперь тесты read-only. Дальше меняется только код,${RESET}`);
console.log(`${DIM}и зелёный цвет будет означать результат, а не подгонку.${RESET}`);
console.log(`${DIM}Причины падений — вход в следующую итерацию:${RESET}\n`);

for (const line of out.split('\n')) {
  if (/^\s*(✖|Error:|AssertionError)/.test(line)) console.log(`  ${line.trim()}`);
}
