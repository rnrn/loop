// Story 1 — automated checks (SPEC §7.2)
// READ-ONLY во время мастер-класса: тесты нельзя ослаблять ради зелёного результата.
//
// Имя каждого теста начинается с кода acceptance criterion из
// stories/1-record-audio.md. Коды идут по возрастанию — порядок появления
// функциональности одинаково виден и в Story, и в выводе тестов.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRecording,
  prependRecording,
} from '../src/recordings-store.js';

import {
  STATES,
  createRecorderMachine,
} from '../src/recording.js';

// --- helpers ---------------------------------------------------------------

function fakeRecorder() {
  const calls = [];
  return {
    state: 'recording',
    calls,
    start() {
      this.state = 'recording';
      calls.push('start');
    },
    stop() {
      calls.push('stop');
      this.state = 'inactive';
    },
  };
}

class DOMExceptionLike extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}

// --- S1-02  После разрешения интерфейс переходит в READY -------------------

test('S1-02  подготовка микрофона переводит NEEDS_PERMISSION → READY', async () => {
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => fakeRecorder(),
  });

  assert.equal(machine.state, STATES.NEEDS_PERMISSION);
  await machine.prepare();
  assert.equal(machine.state, STATES.READY);
});

test('S1-02  состояние возвращается из PROCESSING в READY после создания записи', async () => {
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => fakeRecorder(),
  });

  await machine.prepare();
  machine.startRecording();
  assert.equal(machine.state, STATES.RECORDING);

  machine.stopRecording();
  assert.equal(machine.state, STATES.PROCESSING);

  machine.finishProcessing();
  assert.equal(machine.state, STATES.READY);
});

// --- S1-03  pointerdown начинает запись только из READY --------------------

test('S1-03  pointerdown не начинает запись без разрешения', () => {
  const recorder = fakeRecorder();
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => recorder,
  });

  const started = machine.startRecording();

  assert.equal(started, false);
  assert.equal(machine.state, STATES.NEEDS_PERMISSION);
  assert.equal(recorder.calls.includes('start'), false);
});

// --- S1-04  Безопасная остановка -------------------------------------------

test('S1-04  повторный stop не вызывает MediaRecorder.stop(), если recorder уже inactive', async () => {
  const recorder = fakeRecorder();
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => recorder,
  });

  await machine.prepare();
  machine.startRecording();

  machine.stopRecording();
  machine.stopRecording();
  machine.stopRecording();

  assert.equal(recorder.calls.filter((c) => c === 'stop').length, 1);
});

// --- S1-05  Модель созданной записи ----------------------------------------

test('S1-05  createRecording задаёт стартовые поля записи', () => {
  const rec = createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 10 });
  assert.equal(rec.audioUrl, 'blob:a');
  assert.equal(rec.transcript, '');
  assert.equal(rec.transcriptStatus, 'pending');
  assert.equal(rec.expanded, false);
});

// --- S1-06  Новая запись в начале списка -----------------------------------

test('S1-06  prependRecording ставит новую запись первой', () => {
  const first = createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 });
  const second = createRecording({ id: 'b', audioUrl: 'blob:b', createdAt: 2 });

  const list = prependRecording(second, [first]);

  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'b');
  assert.equal(list[1].id, 'a');
});

test('S1-06  prependRecording не мутирует исходный массив', () => {
  const existing = [createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 })];
  prependRecording(createRecording({ id: 'b', audioUrl: 'blob:b', createdAt: 2 }), existing);
  assert.equal(existing.length, 1);
});

// --- S1-08  Ошибка доступа --------------------------------------------------

test('S1-08  ошибка подготовки микрофона переводит в ERROR без исключения', async () => {
  const machine = createRecorderMachine({
    getStream: async () => {
      throw new DOMExceptionLike('NotAllowedError', 'Permission denied');
    },
    createRecorder: () => fakeRecorder(),
  });

  await assert.doesNotReject(() => machine.prepare());

  assert.equal(machine.state, STATES.ERROR);
  assert.ok(machine.errorMessage);
  assert.equal(typeof machine.errorMessage, 'string');
});

test('S1-08  после ERROR подготовку можно повторить и вернуться в READY', async () => {
  let shouldFail = true;
  const machine = createRecorderMachine({
    getStream: async () => {
      if (shouldFail) throw new DOMExceptionLike('NotAllowedError', 'Permission denied');
      return { id: 'stream' };
    },
    createRecorder: () => fakeRecorder(),
  });

  await machine.prepare();
  assert.equal(machine.state, STATES.ERROR);

  shouldFail = false;
  await machine.prepare();
  assert.equal(machine.state, STATES.READY);
  assert.equal(machine.errorMessage, '');
});
