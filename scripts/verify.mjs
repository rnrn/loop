// Полная регрессия репозитория: рабочее дерево, все чекпоинты, все ветки сценария.
// Это проверка самого учебного материала, а не задание для участников.
import { existsSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, WORKSHOP, CHECKPOINTS, NPM, run, testCounts, ok, fail, info, step,
} from './shared.mjs';

const checks = [];
const record = (name, passed, detail = '') => {
  checks.push({ name, passed });
  (passed ? ok : fail)(`${name}${detail ? ` — ${detail}` : ''}`);
};

// Ожидаемое состояние каждого чекпоинта — часть учебного контракта.
// Счётчики отражают ОБЛАСТЬ АКТИВНОГО ЭТАПА: в начале участник видит
// только тесты Story 1, а не весь курс.
const EXPECTED = [
  { dir: 'checkpoint-00-start', script: 'test', pass: 0, total: 9, note: 'стартовый FAIL, только Story 1' },
  { dir: 'checkpoint-01-recording', script: 'test', pass: 9, total: 9, note: 'Story 1' },
  { dir: 'checkpoint-02-stt', script: 'test', pass: 20, total: 20, note: 'Story 2 + регрессия' },
  { dir: 'checkpoint-03-collapse', script: 'test', pass: 24, total: 24, note: 'change request + регрессия' },
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

step('Согласованность Story и тестов');
// Каждый auto-критерий должен иметь тест с его кодом, и наоборот.
const trace = run(NPM, ['--prefix', WORKSHOP, 'run', 'trace:all'], { stdio: 'pipe' });
record(
  'коды acceptance criteria совпадают в Story и тестах',
  trace.status === 0,
  trace.status === 0 ? '' : 'см. npm run trace:all',
);

step('Переход между этапами');
// Суть loop: открыли следующую Story — система снова стала незавершённой.
// Проверяем на копии, чтобы не трогать сами чекпоинты.
const probe = join(CHECKPOINTS, '.stage-probe');
try {
  rmSync(probe, { recursive: true, force: true });
  cpSync(join(CHECKPOINTS, 'checkpoint-01-recording'), probe, { recursive: true });

  const before = testCounts(probe);
  record('checkpoint-01 на Story 1 зелёный', before.fail === 0 && before.pass === 9, `pass ${before.pass}/${before.tests}`);

  run(process.execPath, ['tools/story.mjs', 'set', 'story-2'], { cwd: probe, stdio: 'pipe' });
  const after = run(NPM, ['--prefix', probe, 'test'], { stdio: 'pipe' });
  const out = `${after.stdout}`;
  record(
    'после открытия Story 2 этап пустой — npm test требует сначала спеку и гейт',
    after.status === 2 && (out.includes('СПЕКИ НЕТ') || out.includes('ГЕЙТА НЕТ')),
    `exit=${after.status}, ${out.includes('СПЕКИ НЕТ') ? 'СПЕКИ НЕТ' : 'ГЕЙТА НЕТ'}`,
  );
} finally {
  rmSync(probe, { recursive: true, force: true });
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
