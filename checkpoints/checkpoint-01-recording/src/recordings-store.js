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

export function applyTranscript(/* recordings, id, transcript */) {
  throw new Error('Not implemented: Story 2 — applyTranscript');
}

export function applyTranscriptStatus(/* recordings, id, status */) {
  throw new Error('Not implemented: Story 2 — applyTranscriptStatus');
}
