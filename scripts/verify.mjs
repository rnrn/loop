// Полная регрессия репозитория: рабочее дерево, все чекпоинты, все ветки сценария.
// Это проверка самого учебного материала, а не задание для участников.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, WORKSHOP, CHECKPOINTS, run, testCounts, ok, fail, info, step,
} from './shared.mjs';

const checks = [];
const record = (name, passed, detail = '') => {
  checks.push({ name, passed });
  (passed ? ok : fail)(`${name}${detail ? ` — ${detail}` : ''}`);
};

// Ожидаемое состояние каждого чекпоинта — часть учебного контракта.
const EXPECTED = [
  { dir: 'checkpoint-00-start', script: 'test', pass: 0, total: 17, note: 'стартовый FAIL' },
  { dir: 'checkpoint-01-recording', script: 'test:story1', pass: 8, total: 8, note: 'Story 1' },
  { dir: 'checkpoint-02-stt', script: 'test', pass: 17, total: 17, note: 'Story 2' },
  { dir: 'checkpoint-03-collapse', script: 'test', pass: 21, total: 21, note: 'change request' },
];

step('Рабочее дерево');
const workshop = testCounts(WORKSHOP);
record(
  'voice-notes-workshop: npm test',
  workshop.fail === 0 && workshop.pass > 0,
  `pass ${workshop.pass}/${workshop.tests}`,
);

step('Чекпоинты §8.2');
for (const exp of EXPECTED) {
  const dir = join(CHECKPOINTS, exp.dir);
  if (!existsSync(dir)) {
    record(`${exp.dir} (${exp.note})`, false, 'директории нет');
    continue;
  }
  const r = testCounts(dir, exp.script);
  record(
    `${exp.dir} (${exp.note})`,
    r.pass === exp.pass && r.tests === exp.total,
    `pass ${r.pass}/${r.tests}, ожидалось ${exp.pass}/${exp.total}`,
  );
}

step('Ручной сценарий в браузере');
const scenario = run(process.execPath, ['scripts/run-all-scenarios.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
record('Все 4 ветки сценария', scenario.status === 0);

step('Итог');
const failed = checks.filter((c) => !c.passed).length;
console.log(`${checks.length - failed}/${checks.length} проверок пройдено`);
if (failed) info('Материал не в согласованном состоянии — чинить до занятия.');
process.exit(failed === 0 ? 0 : 1);
