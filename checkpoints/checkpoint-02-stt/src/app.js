// Story 1 — сборка UI: preflight, удержание кнопки, карточка сверху списка.
// Story 2 — расшифровка как progressive enhancement.
import { STATES, STATE_LABELS, createRecorderMachine } from './recording.js';
import {
  createRecording,
  prependRecording,
  applyTranscript,
  applyTranscriptStatus,
} from './recordings-store.js';
import { createTranscriber, createMockTranscriber } from './speech-recognition.js';

const TRANSCRIPT_LABELS = {
  pending: 'Расшифровка…',
  unavailable: 'Расшифровка недоступна',
  error: 'Расшифровка недоступна (ошибка распознавания)',
};

const prepareButton = document.querySelector('#prepare-button');
const recordButton = document.querySelector('#record-button');
const statusEl = document.querySelector('#status');
const errorEl = document.querySelector('#error');
const listEl = document.querySelector('#recordings');

let recordings = [];
let activeId = null;
let chunks = [];
let session = null;

// --- STT (Story 2) ---------------------------------------------------------

// STT может завершиться и раньше, и позже создания аудиокарточки.
// Результат, пришедший раньше, кладём в буфер и применяем при создании карточки.
const pendingPatches = new Map();

function patchRecording(id, patch) {
  if (recordings.some((rec) => rec.id === id)) {
    recordings =
      patch.transcript !== undefined
        ? applyTranscript(recordings, id, patch.transcript)
        : applyTranscriptStatus(recordings, id, patch.transcriptStatus);
    renderList();
    return;
  }
  pendingPatches.set(id, patch);
}

const handlers = {
  onResult(id, text) {
    patchRecording(id, { transcript: text, transcriptStatus: 'ready' });
  },
  onError(id) {
    // Ошибка распознавания не удаляет и не блокирует аудио.
    patchRecording(id, { transcriptStatus: 'error' });
  },
  onEnd(id, text) {
    if (!text) patchRecording(id, { transcriptStatus: 'unavailable' });
  },
};

const useMock = new URLSearchParams(location.search).has('mock-stt');
const transcriber = useMock
  ? createMockTranscriber(handlers)
  : createTranscriber(window, handlers);

const machine = createRecorderMachine({
  getStream: () => navigator.mediaDevices.getUserMedia({ audio: true }),
  createRecorder: (stream) => {
    const recorder = new MediaRecorder(stream);
    chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => finalizeRecording(recorder));
    return recorder;
  },
  onStateChange: render,
});

function finalizeRecording(recorder) {
  const id = activeId;
  activeId = null;

  const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
  chunks = [];

  const recording = createRecording({
    id,
    audioUrl: URL.createObjectURL(blob),
    createdAt: Date.now(),
  });

  // Карточка появляется независимо от STT — аудио это основной результат.
  if (transcriber.status !== 'supported') recording.transcriptStatus = 'unavailable';

  // Результат STT, пришедший до создания карточки, применяем сразу.
  const early = pendingPatches.get(id);
  if (early) {
    Object.assign(recording, early);
    pendingPatches.delete(id);
  }

  recordings = prependRecording(recording, recordings);
  machine.finishProcessing();
  render();
}

// --- events ----------------------------------------------------------------

prepareButton.addEventListener('click', async () => {
  prepareButton.disabled = true;
  await machine.prepare();
  prepareButton.disabled = false;
});

recordButton.addEventListener('pointerdown', (event) => {
  // pointer capture: отпускание вне кнопки всё равно придёт сюда.
  recordButton.setPointerCapture?.(event.pointerId);
  // id создаётся в момент старта, чтобы поздний результат STT нашёл свою карточку.
  activeId = crypto.randomUUID();
  if (!machine.startRecording()) {
    activeId = null;
    return;
  }
  session = transcriber.start(activeId);
});

const stop = () => {
  if (machine.stopRecording()) {
    session?.stop();
    session = null;
  }
};
recordButton.addEventListener('pointerup', stop);
recordButton.addEventListener('pointercancel', stop);
recordButton.addEventListener('lostpointercapture', stop);

// --- render ----------------------------------------------------------------

function render() {
  const state = machine.state;
  const needsPermission = state === STATES.NEEDS_PERMISSION || state === STATES.ERROR;

  prepareButton.hidden = !needsPermission;
  prepareButton.textContent =
    state === STATES.ERROR ? 'Повторить подготовку микрофона' : STATE_LABELS.NEEDS_PERMISSION;

  recordButton.hidden = needsPermission;
  recordButton.dataset.state = state;
  recordButton.textContent = STATE_LABELS[state] ?? STATE_LABELS.READY;
  recordButton.disabled = state === STATES.PROCESSING;

  errorEl.textContent = state === STATES.ERROR ? machine.errorMessage : '';
  statusEl.textContent = needsPermission
    ? 'Микрофон ещё не подготовлен.'
    : `Записей: ${recordings.length}`;

  renderList();
}

function renderList() {
  listEl.replaceChildren(...recordings.map(renderCard));
}

function renderCard(recording) {
  const li = document.createElement('li');
  li.className = 'card';
  li.dataset.id = recording.id;

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.textContent = new Date(recording.createdAt).toLocaleTimeString('ru-RU');

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = recording.audioUrl;

  const transcript = document.createElement('p');
  transcript.className = 'card__transcript';
  if (recording.transcriptStatus === 'ready') {
    transcript.textContent = recording.transcript;
  } else {
    transcript.classList.add('card__transcript--muted');
    transcript.textContent = TRANSCRIPT_LABELS[recording.transcriptStatus] ?? '';
  }

  li.append(meta, audio, transcript);
  return li;
}

render();
