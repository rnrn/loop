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
    // Коды acceptance criteria. Ими же начинаются имена тестов и пункты
    // ручного сценария, поэтому порядок появления фичи виден везде одинаково.
    // check: auto — закрывается unit-тестом, manual — только браузером (§7.1).
    criteria: [
      { id: 'S1-01', text: 'Доступ к микрофону запрашивается отдельной кнопкой', check: 'manual' },
      { id: 'S1-02', text: 'После разрешения интерфейс переходит в READY', check: 'auto' },
      { id: 'S1-03', text: 'pointerdown начинает запись только из READY', check: 'auto' },
      { id: 'S1-04', text: 'pointerup и pointercancel безопасно останавливают запись', check: 'auto' },
      { id: 'S1-05', text: 'После остановки создаётся Blob и карточка с audio controls', check: 'auto' },
      { id: 'S1-06', text: 'Новая карточка добавляется в начало списка', check: 'auto' },
      { id: 'S1-07', text: 'Можно создать не менее двух записей', check: 'manual' },
      { id: 'S1-08', text: 'Ошибка доступа показана и не роняет приложение', check: 'auto' },
    ],
  },
  {
    id: 'story-2',
    title: 'Story 2 — расшифровка',
    doc: 'stories/2-add-transcription.md',
    tests: ['tests/speech-recognition.test.js'],
    // Гейт этого этапа участник пишет сам: тестов в стартере нет.
    // Story 1 учит проходить цикл, Story 2 — создавать проверку (LOOP.md).
    authoring: true,
    criteria: [
      { id: 'S2-01', text: 'Поддержка определяется через SpeechRecognition или webkitSpeechRecognition', check: 'auto' },
      { id: 'S2-02', text: 'При наличии конструктора используется язык ru-RU', check: 'auto' },
      { id: 'S2-03', text: 'Собираются только финальные результаты', check: 'auto' },
      { id: 'S2-04', text: 'Результат связывается с id соответствующей записи', check: 'auto' },
      { id: 'S2-05', text: 'STT может завершиться позже создания аудиокарточки', check: 'auto' },
      { id: 'S2-06', text: 'Отсутствие или ошибка STT не удаляют и не блокируют аудио', check: 'auto' },
      { id: 'S2-07', text: 'При неподдерживаемом STT показано «Расшифровка недоступна»', check: 'manual' },
    ],
  },
  {
    id: 'change-request',
    title: 'Change request — сворачивание длинных расшифровок',
    doc: 'change-requests/1-collapse-long-transcripts.md',
    tests: ['tests/collapse-transcript.test.js'],
    optional: true,
    criteria: [
      { id: 'CR-01', text: 'Свёрнутый текст занимает максимум четыре строки', check: 'manual' },
      { id: 'CR-02', text: 'Ограничивается только блок расшифровки', check: 'manual' },
      { id: 'CR-03', text: 'Аудиоплеер и метаданные всегда видимы', check: 'manual' },
      { id: 'CR-04', text: 'Клик по тексту или кнопке переключает expanded', check: 'manual' },
      { id: 'CR-05', text: 'Клик по audio не переключает expanded', check: 'manual' },
      { id: 'CR-06', text: 'Состояние expanded хранится для конкретной записи', check: 'auto' },
      { id: 'CR-07', text: 'Интерактивный элемент имеет aria-expanded', check: 'manual' },
    ],
  },
];

/** Все критерии подряд, в порядке появления функциональности. */
export function allCriteria(stages = STAGES) {
  return stages.flatMap((s) => (s.criteria ?? []).map((c) => ({ ...c, stage: s })));
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
