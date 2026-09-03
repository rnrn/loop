# Workshop progress

## Story 1 — Record audio
Status: done

Automated evidence:
- Command: npm test (активный этап — Story 1)
- Result: PASS — tests 8, pass 8, fail 0
  (до реализации: tests 8, pass 0, fail 8 — ожидаемый стартовый FAIL
   ровно по Story 1; этапы Story 2 и change request ещё закрыты)

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
- Command: npm test (после npm run story:next — активен Story 2)
- Result: PASS — tests 17, pass 17, fail 0 (Story 1 не регрессировала;
  открытый этап всегда тянет за собой предыдущие)
  (сразу после открытия этапа: tests 17, pass 8, fail 9 — новый FAIL)

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
Status: done

Evidence:
- Стартовый FAIL после npm run story:next (открыт этап change request):
  npm test → tests 18, pass 17, fail 1 — файл теста не импортируется,
  потому что toggleExpanded отсутствует
- Four-line collapsed state: PASS — computed -webkit-line-clamp = 4,
  в раскрытом состоянии clamp снят
- Expand/collapse works: PASS — клик по тексту раскрывает,
  отдельная кнопка сворачивает; aria-expanded на обоих элементах
- Audio controls unaffected: PASS — клик по audio не меняет expanded;
  плеер и метаданные видимы в свёрнутом состоянии
- Состояние expanded хранится для конкретной записи: PASS — ["true","false"]
- Full npm test result: PASS — tests 21, pass 21, fail 0
- Ручной сценарий: node scenario-run/manual-run.mjs cr → 19/19

## Definition of Done мастер-класса (§7.7)

- [PASS] Микрофон подготовлен либо корректно обработана недоступность.
- [PASS] Удержание запускает запись, отпускание завершает её.
- [PASS] После остановки создаётся воспроизводимая аудиокарточка.
- [PASS] Новая запись появляется сверху.
- [PASS] Созданы и воспроизводятся не менее двух записей.
- [PASS] STT показывает текст или согласованный fallback (проверены обе ветки).
- [PASS] Полный npm test проходит — 21/21.
- [PASS] В консоли нет необработанных ошибок.
- [PASS] progress.md содержит автоматические и ручные доказательства.
