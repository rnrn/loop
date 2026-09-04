// Карта покрытия: какой acceptance criterion чем закрыт.
//
//   npm run trace         только открытые этапы
//   npm run trace -- --all  все этапы курса
//
// Заодно сторожит расхождение: критерий с check:auto без теста и тест
// с кодом, которого нет ни в одной Story, — это рассинхрон Story и тестов.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, STAGES, readState, openStages, allCriteria, createColors } from './stages.mjs';

const {
  reset: RESET, green: GREEN, yellow: YELLOW, yellowPlain: MANUAL, dim: DIM, bold: BOLD,
} = createColors();

const all = process.argv.includes('--all');
const stages = all ? STAGES : openStages(readState());

/** Коды из имён тестов: test('S1-02  ...') */
function testIdsOf(stage) {
  const found = new Map();
  for (const rel of stage.tests) {
    const file = join(ROOT, rel);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\btest\(\s*['"`]([A-Z]{1,2}\d?-\d{2})\s/g)) {
      found.set(m[1], (found.get(m[1]) ?? 0) + 1);
    }
  }
  return found;
}

let problems = 0;
const knownIds = new Set(allCriteria().map((x) => x.id));

for (const stage of stages) {
  console.log(`\n${BOLD}${stage.title}${RESET}`);
  console.log(`${DIM}${stage.doc}${RESET}\n`);

  const tests = testIdsOf(stage);

  for (const crit of stage.criteria ?? []) {
    const count = tests.get(crit.id) ?? 0;
    if (crit.check === 'auto') {
      if (count > 0) {
        console.log(`  ${GREEN}${crit.id}${RESET}  ${crit.text}  ${DIM}— тестов: ${count}${RESET}`);
      } else {
        console.log(`  ${YELLOW}${crit.id}${RESET}  ${crit.text}  ${YELLOW}— нет теста${RESET}`);
        problems += 1;
      }
    } else {
      // Ручные критерии выделяем: автоматика их не поймает, проверяет только человек.
      console.log(`  ${MANUAL}${crit.id}${RESET}  ${crit.text}  ${MANUAL}— ручной сценарий${RESET}`);
    }
  }

  // Тест с кодом, которого нет ни в одной Story.
  for (const id of tests.keys()) {
    if (!knownIds.has(id)) {
      console.log(`  ${YELLOW}${id}${RESET}  ${YELLOW}тест есть, критерия в Story нет${RESET}`);
      problems += 1;
    }
  }
}

const shown = stages.flatMap((s) => s.criteria ?? []);
const auto = shown.filter((x) => x.check === 'auto').length;

console.log(`\n${DIM}Критериев: ${shown.length} — из них ${auto} закрыты npm test, ` +
  `${shown.length - auto} только ручным сценарием (§7.1).${RESET}`);

if (problems > 0) {
  console.log(`${YELLOW}Рассинхрон Story и тестов: ${problems}.${RESET}`);
  process.exit(1);
}
console.log(`${GREEN}Story и тесты согласованы.${RESET}`);
