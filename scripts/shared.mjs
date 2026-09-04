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

// Яркие варианты (9x) вместо базовых (3x): на тёмной теме терминала и на
// проекторе базовый красный/жёлтый читаются плохо. NO_COLOR=1 отключает цвет.
// Без проверки isTTY ANSI-коды печатаются буквально при перенаправлении вывода
// и в консолях без Virtual Terminal. FORCE_COLOR=1 включает принудительно.
const COLOR = process.env.NO_COLOR
  ? false
  : Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY);
const ESC = '\u001b[';
const c = (code) => (COLOR ? `${ESC}${code}m` : '');

const C = {
  reset: c(0),
  dim: c(2),
  bold: c(1),
  green: c('1;92'),
  yellow: c('1;93'),
  red: c('1;91'),
};

// Шкала серьёзности. Красный зарезервирован за одним случаем: сломан сам
// учебный материал. Всё остальное — жёлтое, потому что в этом курсе неуспех
// сплошь и рядом является нормой: ожидаемый FAIL это вход в цикл, а не авария.
//
//   [ OK ]   зелёный   всё как задумано
//   [ !! ]   жёлтый    некритично: чинится, обходится или так и должно быть
//   [BROKEN] красный   материал непригоден для занятия
export const ok = (msg) => console.log(`${C.green}[ OK ]${C.reset} ${msg}`);
export const soft = (msg) => console.log(`${C.yellow}[ !! ]${C.reset} ${msg}`);
export const warn = soft;
export const fail = (msg) => console.log(`${C.red}[BROKEN]${C.reset} ${msg}`);
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
  // Раннер раскрашивает вывод, поэтому ANSI-коды надо снять до разбора счётчиков.
  const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.replace(/\[[0-9;]*m/g, '');
  const num = (key) => {
    const m = out.match(new RegExp(`^\\u2139 ${key} (\\d+)$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  return { tests: num('tests'), pass: num('pass'), fail: num('fail'), raw: out };
}

export function nodeMajor() {
  return Number(process.versions.node.split('.')[0]);
}
