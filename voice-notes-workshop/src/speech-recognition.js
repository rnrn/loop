// Адаптер браузерного STT (SPEC §3.5). Progressive enhancement:
// отсутствие или ошибка распознавания не должны ломать аудиозапись.

export const LANG = 'ru-RU';

export function detectSpeechSupport(win = globalThis) {
  const Constructor = win?.SpeechRecognition ?? win?.webkitSpeechRecognition ?? null;
  return {
    status: Constructor ? 'supported' : 'unavailable',
    Constructor,
  };
}

export function collectFinalTranscript(event) {
  // Берём только финальные результаты — промежуточные гипотезы игнорируем.
  let text = '';
  for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (result.isFinal) text += result[0].transcript;
  }
  return text;
}

/**
 * Создаёт транскрайбер. Ни один вызов не бросает исключение при отсутствии STT —
 * вместо этого возвращается статус unavailable.
 */
export function createTranscriber(win = globalThis, handlers = {}) {
  const { status, Constructor } = detectSpeechSupport(win);
  const { onResult, onError, onEnd } = handlers;

  return {
    status,

    start(recordingId) {
      if (status !== 'supported') return null;

      const recognition = new Constructor();
      recognition.lang = LANG;
      recognition.interimResults = false;
      recognition.continuous = true;

      let transcript = '';

      recognition.onresult = (event) => {
        transcript += collectFinalTranscript(event);
      };
      // Ошибка STT относится к конкретной записи и не трогает аудио.
      recognition.onerror = (event) => onError?.(recordingId, event?.error ?? 'unknown');
      recognition.onend = () => {
        // Результат может прийти позже создания аудиокарточки — связываем по id.
        if (transcript.trim()) onResult?.(recordingId, transcript.trim());
        onEnd?.(recordingId, transcript.trim());
      };

      recognition.start();
      return { recordingId, recognition, stop: () => recognition.stop() };
    },
  };
}

/**
 * Учебный mock-режим (§7.6): тот же интерфейс и тот же путь обновления записи.
 */
export function createMockTranscriber(handlers = {}, text = 'Сегодня мы проверяем расшифровку голосовой заметки', delayMs = 700) {
  const { onResult, onEnd } = handlers;
  return {
    status: 'supported',
    start(recordingId) {
      const timer = setTimeout(() => {
        onResult?.(recordingId, text);
        onEnd?.(recordingId, text);
      }, delayMs);
      return { recordingId, recognition: { lang: LANG, mock: true }, stop: () => {} , timer };
    },
  };
}
