// Машина состояний записи (SPEC §3.3).
// Story 1: preflight микрофона, pointerdown/pointerup, безопасная повторная остановка.

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

const ERROR_MESSAGES = {
  NotAllowedError: 'Доступ к микрофону запрещён. Разрешите микрофон в настройках сайта и повторите.',
  NotFoundError: 'Микрофон не найден. Подключите устройство и повторите подготовку.',
  NotReadableError: 'Микрофон занят другим приложением. Закройте его и повторите.',
  SecurityError: 'Браузер заблокировал микрофон. Откройте страницу через локальный dev server.',
};

function describeError(error) {
  return (
    ERROR_MESSAGES[error?.name] ??
    `Не удалось подготовить микрофон: ${error?.message ?? 'неизвестная ошибка'}`
  );
}

/**
 * @param {object} deps
 * @param {() => Promise<MediaStream>} deps.getStream
 * @param {(stream: MediaStream) => MediaRecorder} deps.createRecorder
 * @param {(state: string) => void} [deps.onStateChange]
 */
export function createRecorderMachine({ getStream, createRecorder, onStateChange }) {
  const machine = {
    state: STATES.NEEDS_PERMISSION,
    errorMessage: '',
    stream: null,
    recorder: null,

    async prepare() {
      try {
        machine.stream = await getStream();
        machine.errorMessage = '';
        setState(STATES.READY);
      } catch (error) {
        // Отказ в доступе — ожидаемая ветка, а не исключение приложения (SPEC §7.2).
        machine.stream = null;
        machine.errorMessage = describeError(error);
        setState(STATES.ERROR);
      }
      return machine.state;
    },

    startRecording() {
      // pointerdown начинает запись ТОЛЬКО из READY.
      if (machine.state !== STATES.READY) return false;

      machine.recorder = createRecorder(machine.stream);
      machine.recorder.start();
      setState(STATES.RECORDING);
      return true;
    },

    stopRecording() {
      // pointerup и pointercancel могут прийти оба — останавливаем ровно один раз.
      if (machine.state !== STATES.RECORDING) return false;

      setState(STATES.PROCESSING);
      if (machine.recorder && machine.recorder.state !== 'inactive') {
        machine.recorder.stop();
      }
      return true;
    },

    finishProcessing() {
      if (machine.state !== STATES.PROCESSING) return false;
      setState(STATES.READY);
      return true;
    },

    fail(message) {
      machine.errorMessage = message;
      setState(STATES.ERROR);
    },
  };

  function setState(next) {
    machine.state = next;
    onStateChange?.(next);
  }

  return machine;
}
