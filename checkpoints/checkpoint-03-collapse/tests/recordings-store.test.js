// Story 1 — automated checks (SPEC §7.2)
// READ-ONLY во время мастер-класса: тесты нельзя ослаблять ради зелёного результата.
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

// --- 7.2.1 -----------------------------------------------------------------

test('prependRecording ставит новую запись первой', () => {
  const first = createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 });
  const second = createRecording({ id: 'b', audioUrl: 'blob:b', createdAt: 2 });

  const list = prependRecording(second, [first]);

  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'b');
  assert.equal(list[1].id, 'a');
});

test('prependRecording не мутирует исходный массив', () => {
  const existing = [createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 })];
  prependRecording(createRecording({ id: 'b', audioUrl: 'blob:b', createdAt: 2 }), existing);
  assert.equal(existing.length, 1);
});

test('createRecording задаёт стартовые поля записи', () => {
  const rec = createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 10 });
  assert.equal(rec.transcript, '');
  assert.equal(rec.transcriptStatus, 'pending');
  assert.equal(rec.expanded, false);
});

// --- 7.2.2 -----------------------------------------------------------------

test('повторный stop не вызывает MediaRecorder.stop(), если recorder уже inactive', async () => {
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

// --- 7.2.3 -----------------------------------------------------------------

test('состояние возвращается из PROCESSING в READY после создания записи', async () => {
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => fakeRecorder(),
  });

  assert.equal(machine.state, STATES.NEEDS_PERMISSION);

  await machine.prepare();
  assert.equal(machine.state, STATES.READY);

  machine.startRecording();
  assert.equal(machine.state, STATES.RECORDING);

  machine.stopRecording();
  assert.equal(machine.state, STATES.PROCESSING);

  machine.finishProcessing();
  assert.equal(machine.state, STATES.READY);
});

test('pointerdown начинает запись только из состояния READY', () => {
  const recorder = fakeRecorder();
  const machine = createRecorderMachine({
    getStream: async () => ({ id: 'stream' }),
    createRecorder: () => recorder,
  });

  // ещё нет разрешения — запись не должна стартовать
  const started = machine.startRecording();

  assert.equal(started, false);
  assert.equal(machine.state, STATES.NEEDS_PERMISSION);
  assert.equal(recorder.calls.includes('start'), false);
});

// --- 7.2.4 -----------------------------------------------------------------

test('ошибка подготовки микрофона переводит в ERROR без исключения', async () => {
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

test('после ERROR подготовку можно повторить и вернуться в READY', async () => {
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

class DOMExceptionLike extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }
}
