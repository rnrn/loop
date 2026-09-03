// Хранилище записей — чистые функции без DOM (SPEC §3.4).

export function createRecording({ id, audioUrl, createdAt }) {
  return {
    id,
    audioUrl,
    createdAt,
    transcript: '',
    transcriptStatus: 'pending',
    expanded: false,
  };
}

export function prependRecording(recording, existing = []) {
  // Новая запись всегда первая; исходный массив не мутируется.
  return [recording, ...existing];
}

// --- Story 2 -------------------------------------------------------------

// Обновление идёт по id, а не «по последней карточке»: результат STT может
// прийти уже после того, как пользователь начал следующую запись.
function updateById(recordings, id, patch) {
  return recordings.map((rec) => (rec.id === id ? { ...rec, ...patch } : rec));
}

export function applyTranscript(recordings, id, transcript) {
  return updateById(recordings, id, { transcript, transcriptStatus: 'ready' });
}

export function applyTranscriptStatus(recordings, id, status) {
  // Статус меняется, аудио остаётся на месте.
  return updateById(recordings, id, { transcriptStatus: status });
}

// --- Change request ------------------------------------------------------

export function toggleExpanded(recordings, id) {
  // Раскрытие хранится для конкретной записи, остальные не трогаем.
  return recordings.map((rec) => (rec.id === id ? { ...rec, expanded: !rec.expanded } : rec));
}
