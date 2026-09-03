// Хранилище записей — чистые функции без DOM.
// STARTER STATE: реализация отсутствует. Story 1 должна сделать эти тесты зелёными.
//
// Модель одной записи (SPEC §3.4):
// {
//   id, audioUrl, createdAt,
//   transcript: '', transcriptStatus: 'pending' | 'ready' | 'unavailable' | 'error',
//   expanded: false
// }

export function createRecording(/* { id, audioUrl, createdAt } */) {
  throw new Error('Not implemented: Story 1 — createRecording');
}

export function prependRecording(/* recording, existing */) {
  throw new Error('Not implemented: Story 1 — prependRecording');
}

// --- Story 2 -------------------------------------------------------------

export function applyTranscript(/* recordings, id, transcript */) {
  throw new Error('Not implemented: Story 2 — applyTranscript');
}

export function applyTranscriptStatus(/* recordings, id, status */) {
  throw new Error('Not implemented: Story 2 — applyTranscriptStatus');
}
