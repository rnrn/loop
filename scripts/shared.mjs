// Общие утилиты для скриптов развёртывания и проверки.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const WORKSHOP = join(ROOT, 'voice-notes-workshop');
export const CHECKPOINTS = join(ROOT, 'checkpoints');

export const CHECKPOINT_NAMES = [
  'checkpoint-00-start',
  'checkpoint-01-recording',
  'checkpoint-02-stt',
  'checkpoint-03-collapse',
];

const C = {
  reset: '[0m',
  dim: '[2m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
  bold: '[1m',
};

export const ok = (msg) => console.log(`${C.green}[ OK ]${C.reset} ${msg}`);
export const fail = (msg) => console.log(`${C.red}[FAIL]${C.reset} ${msg}`);
export const warn = (msg) => console.log(`${C.yellow}[WARN]${C.reset} ${msg}`);
export const info = (msg) => console.log(`${C.dim}       ${msg}${C.reset}`);
export const step = (msg) => console.log(`\n${C.bold}${msg}${C.reset}`);

/** npm на Windows — это npm.cmd; spawnSync без shell его не найдёт. */
export const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function run(command, args, options = {}) {
  // shell нужен только для .cmd-обёрток (npm на Windows). Для node.exe он вреден:
  // путь «C:\Program Files\...» рвётся по пробелу.
  const needsShell = process.platform === 'win32' && command.endsWith('.cmd');
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: needsShell,
    ...options,
  });
}

/**
 * Запускает npm test в указанной директории и возвращает счётчики node:test.
 */
export function testCounts(cwd, script = 'test') {
  const res = run(NPM, ['--prefix', cwd, 'run', script], { stdio: 'pipe' });
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  const num = (key) => {
    const m = out.match(new RegExp(`^\\u2139 ${key} (\\d+)$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  return { tests: num('tests'), pass: num('pass'), fail: num('fail'), raw: out };
}

export function nodeMajor() {
  return Number(process.versions.node.split('.')[0]);
}
