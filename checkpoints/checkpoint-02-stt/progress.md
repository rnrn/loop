# Workshop progress

## Story 1 — Record audio
Status: done

Automated evidence:
- Command: npm run test:story1
- Result: PASS — tests 8, pass 8, fail 0
  (до реализации: npm test → tests 17, pass 0, fail 17 — ожидаемый стартовый FAIL)

Manual evidence (Chromium + fake-микрофон, node scenario-run/manual-run.mjs story1):
- Two recordings created: PASS — 2 карточки
- Newest recording displayed first: PASS — 09:23:04 выше 09:23:03
- Both recordings played: PASS — [true, true], currentTime > 0
- Pointer release outside button stopped recording: PASS — запись завершилась ровно один раз
- Console errors: PASS — необработанных ошибок нет

Issues and decisions:
- pointer capture + обработчик lostpointercapture — отпускание вне кнопки приходит на саму кнопку.
- Повторная остановка защищена гвардом состояния (state !== RECORDING) и проверкой recorder.state.
- STT намеренно не реализован: он вне scope Story 1.

## Story 2 — Add transcription
Status: done

Automated evidence:
- Command: npm test (полный набор)
- Result: PASS — tests 17, pass 17, fail 0 (Story 1 не регрессировала)

Manual evidence (node scenario-run/manual-run.mjs fallback | story2):
- Phrase recorded: «Сегодня мы проверяем расшифровку голосовой заметки»
- Transcript or fallback shown:
  - ветка «STT отсутствует» (Chromium без SpeechRecognition): PASS — «Расшифровка недоступна»
  - ветка «?mock-stt=1»: PASS — в карточке полный текст фразы
- Audio still playable: PASS — обе записи воспроизводятся в обеих ветках
- Story 1 regression check: PASS — 2 карточки, новая сверху, консоль чистая

Issues and decisions:
- FAIL на первой итерации: карточка застревала на статусе «Расшифровка…».
  Первопричина — результат STT приходил РАНЬШЕ создания аудиокарточки,
  поэтому обновление по id не находило запись и текст терялся.
  Исправление: буфер pendingPatches в app.js, патч применяется в момент
  создания карточки. Тесты не ослаблялись; ужесточена ручная проверка
  (pending-подпись больше не засчитывается как результат).
- Регрессия покрыта ручным браузерным ярусом, а не unit-тестом: по §7.1
  интеграция с браузером проверяется ручным сценарием.

## Change request
Status: not_started

Evidence:
- Four-line collapsed state:
- Expand/collapse works:
- Audio controls unaffected:
- Full npm test result:
