// Этапы мастер-класса и «что сейчас открыто».
//
// Модератор открывает только текущую Story (§2.3), поэтому npm test проверяет
// активный этап и всё, что было пройдено до него. Тесты будущих этапов лежат
// в репозитории с самого начала, но не запускаются: участник видит FAIL ровно
// по своей задаче, а не по всему курсу.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_FILE = join(ROOT, 'workshop.state.json');

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
  },
  {
    id: 'change-request',
    title: 'Change request — сворачивание длинных расшифровок',
    doc: 'change-requests/1-collapse-long-transcripts.md',
    tests: ['tests/collapse-transcript.test.js'],
    optional: true,
  },
];

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
