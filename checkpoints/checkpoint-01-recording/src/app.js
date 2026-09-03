// Story 1 — сборка UI: preflight, удержание кнопки, карточка сверху списка.
import { STATES, STATE_LABELS, createRecorderMachine } from './recording.js';
import { createRecording, prependRecording } from './recordings-store.js';

const prepareButton = document.querySelector('#prepare-button');
const recordButton = document.querySelector('#record-button');
const statusEl = document.querySelector('#status');
const errorEl = document.querySelector('#error');
const listEl = document.querySelector('#recordings');

let recordings = [];
let activeId = null;
let chunks = [];

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
  activeId = crypto.randomUUID();
  if (!machine.startRecording()) activeId = null;
});

const stop = () => machine.stopRecording();
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

  li.append(meta, audio);
  return li;
}

render();
