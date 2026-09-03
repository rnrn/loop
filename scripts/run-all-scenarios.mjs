// Прогон ручного сценария во всех ветках подряд (§6.4, §6.6, §6.7).
// Порты разводятся, чтобы прогоны не мешали друг другу при повторных запусках.
import { ROOT, run, ok, fail, step } from './shared.mjs';

const STAGES = [
  { id: 'story1', title: 'Story 1 — запись аудио' },
  { id: 'fallback', title: 'Story 2 — ветка «STT недоступен»' },
  { id: 'story2', title: 'Story 2 — ветка ?mock-stt=1' },
  { id: 'cr', title: 'Change request — сворачивание текста' },
];

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const stages = only.length ? STAGES.filter((s) => only.includes(s.id)) : STAGES;

const results = [];
let port = 5199;

for (const stage of stages) {
  step(`${stage.title}  (${stage.id})`);
  const res = run(process.execPath, ['scenario-run/manual-run.mjs', stage.id], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, SCENARIO_PORT: String(port++) },
  });
  results.push({ ...stage, ok: res.status === 0 });
}

step('Итог прогона сценария');
for (const r of results) (r.ok ? ok : fail)(`${r.id} — ${r.title}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} веток сценария пройдено`);
process.exit(failed === 0 ? 0 : 1);
