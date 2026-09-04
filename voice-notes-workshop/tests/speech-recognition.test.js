// Story 2 — automated checks (SPEC §7.3)
// READ-ONLY во время мастер-класса: тесты нельзя ослаблять ради зелёного результата.
//
// Имя каждого теста начинается с кода acceptance criterion из
// stories/2-add-transcription.md. Коды идут по возрастанию.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectSpeechSupport,
  createTranscriber,
  collectFinalTranscript,
} from '../src/speech-recognition.js';

import {
  createRecording,
  prependRecording,
  applyTranscript,
  applyTranscriptStatus,
} from '../src/recordings-store.js';

// --- helpers ---------------------------------------------------------------

class FakeRecognition {
  constructor() {
    this.lang = '';
    this.interimResults = false;
    this.continuous = false;
    this.started = false;
    this.stopped = false;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

function resultsEvent(items) {
  const list = items.map(([transcript, isFinal]) => ({
    isFinal,
    0: { transcript },
    length: 1,
  }));
  list.length = items.length;
  return { resultIndex: 0, results: list };
}

// --- S2-01  Определение поддержки ------------------------------------------

test('S2-01  window.SpeechRecognition определяется как supported', () => {
  const support = detectSpeechSupport({ SpeechRecognition: FakeRecognition });
  assert.equal(support.status, 'supported');
  assert.equal(support.Constructor, FakeRecognition);
});

test('S2-01  только window.webkitSpeechRecognition тоже supported', () => {
  const support = detectSpeechSupport({ webkitSpeechRecognition: FakeRecognition });
  assert.equal(support.status, 'supported');
  assert.equal(support.Constructor, FakeRecognition);
});

test('S2-01  отсутствие обоих конструкторов даёт unavailable', () => {
  const support = detectSpeechSupport({});
  assert.equal(support.status, 'unavailable');
  assert.equal(support.Constructor, null);
});

// --- S2-02  Язык распознавания ---------------------------------------------

test('S2-02  при поддержке используется язык ru-RU', () => {
  const transcriber = createTranscriber({ SpeechRecognition: FakeRecognition });
  const session = transcriber.start('rec-1');
  assert.equal(session.recognition.lang, 'ru-RU');
  assert.equal(session.recognition.started, true);
});

// --- S2-03  Только финальные результаты ------------------------------------

test('S2-03  собираются только финальные результаты распознавания', () => {
  const event = resultsEvent([
    ['первая часть ', true],
    ['промежуточный мусор', false],
    ['вторая часть', true],
  ]);
  assert.equal(collectFinalTranscript(event), 'первая часть вторая часть');
});

// --- S2-04  Связь результата с записью по id -------------------------------

test('S2-04  applyTranscript пишет текст в запись с совпадающим id', () => {
  const list = prependRecording(
    createRecording({ id: 'rec-1', audioUrl: 'blob:1', createdAt: 1 }),
    [],
  );

  const next = applyTranscript(list, 'rec-1', 'текст заметки');

  assert.equal(next[0].transcript, 'текст заметки');
  assert.equal(next[0].transcriptStatus, 'ready');
});

test('S2-04  неизвестный id не меняет ни одну запись', () => {
  const list = prependRecording(
    createRecording({ id: 'rec-1', audioUrl: 'blob:1', createdAt: 1 }),
    [],
  );

  const next = applyTranscript(list, 'rec-999', 'чужой текст');

  assert.equal(next.length, 1);
  assert.equal(next[0].transcript, '');
  assert.equal(next[0].transcriptStatus, 'pending');
});

// --- S2-05  Поздний результат ----------------------------------------------

test('S2-05  поздний результат обновляет запись по id, а не последнюю карточку', () => {
  let list = prependRecording(
    createRecording({ id: 'rec-1', audioUrl: 'blob:1', createdAt: 1 }),
    [],
  );
  // пользователь уже начал и завершил вторую запись
  list = prependRecording(
    createRecording({ id: 'rec-2', audioUrl: 'blob:2', createdAt: 2 }),
    list,
  );

  // STT первой записи пришёл с опозданием
  const next = applyTranscript(list, 'rec-1', 'Первая тестовая голосовая заметка');

  const byId = Object.fromEntries(next.map((r) => [r.id, r]));
  assert.equal(byId['rec-1'].transcript, 'Первая тестовая голосовая заметка');
  assert.equal(byId['rec-1'].transcriptStatus, 'ready');
  assert.equal(byId['rec-2'].transcript, '');
  assert.equal(byId['rec-2'].transcriptStatus, 'pending');
  // порядок карточек не меняется
  assert.deepEqual(next.map((r) => r.id), ['rec-2', 'rec-1']);
});

// --- S2-06  Аудио переживает отсутствие и ошибку STT -----------------------

test('S2-06  без поддержки transcriber возвращает статус unavailable, а не бросает', () => {
  const transcriber = createTranscriber({});
  assert.equal(transcriber.status, 'unavailable');
  const session = transcriber.start('rec-1');
  assert.equal(session, null);
});

test('S2-06  STT error не удаляет запись и меняет только transcriptStatus', () => {
  const rec = createRecording({ id: 'rec-1', audioUrl: 'blob:1', createdAt: 1 });
  const list = prependRecording(rec, []);

  const next = applyTranscriptStatus(list, 'rec-1', 'error');

  assert.equal(next.length, 1);
  assert.equal(next[0].id, 'rec-1');
  assert.equal(next[0].audioUrl, 'blob:1');
  assert.equal(next[0].transcriptStatus, 'error');
});

test('S2-06  unavailable-статус сохраняет аудио', () => {
  const list = prependRecording(
    createRecording({ id: 'rec-1', audioUrl: 'blob:1', createdAt: 1 }),
    [],
  );
  const next = applyTranscriptStatus(list, 'rec-1', 'unavailable');
  assert.equal(next[0].audioUrl, 'blob:1');
  assert.equal(next[0].transcriptStatus, 'unavailable');
});
