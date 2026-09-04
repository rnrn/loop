// Этапы мастер-класса и «что сейчас открыто».
//
// Модератор открывает только текущую Story (§2.3), поэтому npm test проверяет
// активный этап и всё, что было пройдено до него. Тесты будущих этапов лежат
// в репозитории с самого начала, но не запускаются: участник видит FAIL ровно
// по своей задаче, а не по всему курсу.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
// Критерии читаются ИЗ Story, а не хранятся здесь: Story — единственный
// источник истины. Иначе участник, написавший свою спеку, увидел бы в trace
// чужие критерии.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_FILE = join(ROOT, 'workshop.state.json');

/**
 * Цвет включаем только если поток действительно его отрисует.
 * Без проверки isTTY ANSI-коды печатаются буквально при перенаправлении вывода
 * и в консолях без Virtual Terminal.
 *   NO_COLOR=1     выключить принудительно
 *   FORCE_COLOR=1  включить принудительно (например, при пайпе)
 */
export function createColors(stream = process.stdout) {
  const enabled = process.env.NO_COLOR
    ? false
    : Boolean(process.env.FORCE_COLOR) || Boolean(stream.isTTY);
  const c = (code) => (enabled ? `[${code}m` : '');
  return {
    enabled,
    reset: c(0),
    dim: c(2),
    bold: c(1),
    green: c('1;92'),
    yellow: c('1;93'),
    // Обычный жёлтый — «нужны твои руки»; жирный — «требует внимания сейчас».
    yellowPlain: c('93'),
  };
}

export const STAGES = [
  {
    id: 'story-1',
    title: 'Story 1 — запись аудио',
    doc: 'stories/1-record-audio.md',
    tests: ['tests/recordings-store.test.js'],
  },
  {
    id: 'story-2',
    title: 'Story 2 — расшифровка',
    doc: 'stories/2-add-transcription.md',
    tests: ['tests/speech-recognition.test.js'],
    // Гейт этого этапа участник пишет сам: тестов в стартере нет.
    // Story 1 учит проходить цикл, Story 2 — создавать проверку (LOOP.md).
    authoring: true,
  },
  {
    id: 'change-request',
    title: 'Change request — сворачивание длинных расшифровок',
    doc: 'change-requests/1-collapse-long-transcripts.md',
    tests: ['tests/collapse-transcript.test.js'],
    optional: true,
  },
];

/**
 * Критерии этапа читаются из его Story. Ожидается таблица вида:
 *
 *   Код   | Критерий                        | Чем проверяется
 *   S2-01 | Поддержка определяется через ... | `npm test`
 *
 * Признак «закрывается тестом» — упоминание npm test в третьей колонке.
 * Всё остальное считается ручной проверкой.
 */
export function readCriteria(stage) {
  const file = join(ROOT, stage.doc);
  if (!existsSync(file)) return null; // Story ещё не написана
  const rows = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z]{1,2}\d?-\d{2})\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
    if (m) rows.push({ id: m[1], text: m[2], check: /npm\s+test/.test(m[3]) ? 'auto' : 'manual' });
  }
  return rows;
}

/** Все критерии подряд, в порядке появления функциональности. */
export function allCriteria(stages = STAGES) {
  return stages.flatMap((s) => (readCriteria(s) ?? []).map((c) => ({ ...c, stage: s })));
}

export const FIRST_STAGE = STAGES[0].id;

export function readState() {
  if (!existsSync(STATE_FILE)) return { activeStage: FIRST_STAGE };
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    return STAGES.some((s) => s.id === state.activeStage) ? state : { activeStage: FIRST_STAGE };
  } catch {
    return { activeStage: FIRST_STAGE };
  }
}

export function writeState(activeStage) {
  writeFileSync(STATE_FILE, `${JSON.stringify({ activeStage }, null, 2)}\n`, 'utf8');
}

export function activeIndex(state = readState()) {
  return Math.max(0, STAGES.findIndex((s) => s.id === state.activeStage));
}

/** Этапы, открытые на данный момент: пройденные плюс текущий. */
export function openStages(state = readState()) {
  return STAGES.slice(0, activeIndex(state) + 1);
}

export function testFiles(stages) {
  return stages.flatMap((s) => s.tests).filter((f) => existsSync(join(ROOT, f)));
}
