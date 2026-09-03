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
Status: todo

Automated evidence:
- Command: npm test
- Result:

Manual evidence:
- Phrase recorded:
- Transcript or fallback shown:
- Audio still playable:
- Story 1 regression check:

Issues and decisions:
-

## Change request
Status: not_started

Evidence:
- Four-line collapsed state:
- Expand/collapse works:
- Audio controls unaffected:
- Full npm test result:
