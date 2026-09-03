// Машина состояний записи (SPEC §3.3).
// STARTER STATE: реализация отсутствует. Story 1 должна сделать эти тесты зелёными.

export const STATES = {
  NEEDS_PERMISSION: 'NEEDS_PERMISSION',
  READY: 'READY',
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR',
};

export const STATE_LABELS = {
  NEEDS_PERMISSION: 'Подготовить микрофон',
  READY: 'Зажмите, чтобы записать',
  RECORDING: 'Идёт запись — отпустите',
  PROCESSING: 'Сохраняем запись…',
  ERROR: 'Ошибка',
};

/**
 * @param {object} deps
 * @param {() => Promise<MediaStream>} deps.getStream
 * @param {(stream: MediaStream) => MediaRecorder} deps.createRecorder
 */
export function createRecorderMachine(/* deps */) {
  throw new Error('Not implemented: Story 1 — createRecorderMachine');
}
