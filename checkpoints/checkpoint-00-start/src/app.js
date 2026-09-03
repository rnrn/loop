// STARTER STATE.
// Страница отрисована, но запись не работает: это ожидаемое незавершённое состояние
// перед Story 1. Реализация появляется в src/recording.js и src/recordings-store.js.

const statusEl = document.querySelector('#status');
const prepareButton = document.querySelector('#prepare-button');

statusEl.textContent = 'Story 1 ещё не реализована — запустите npm test и посмотрите FAIL.';

prepareButton.addEventListener('click', () => {
  statusEl.textContent =
    'Подготовка микрофона не реализована. Это Story 1 (stories/1-record-audio.md).';
});
