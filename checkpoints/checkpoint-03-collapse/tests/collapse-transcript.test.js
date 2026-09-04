// Change request — automated checks (SPEC §7.4)
// Этап открывается модератором: npm run story:next.
//
// Имя каждого теста начинается с кода acceptance criterion из
// change-requests/1-collapse-long-transcripts.md.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRecording,
  prependRecording,
  toggleExpanded,
} from '../src/recordings-store.js';

// --- CR-06  Состояние expanded принадлежит конкретной записи ---------------

test('CR-06  по умолчанию expanded равен false', () => {
  const rec = createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 });
  assert.equal(rec.expanded, false);
});

test('CR-06  toggleExpanded меняет expanded только у указанной записи', () => {
  let list = prependRecording(createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 }), []);
  list = prependRecording(createRecording({ id: 'b', audioUrl: 'blob:b', createdAt: 2 }), list);

  const next = toggleExpanded(list, 'a');
  const byId = Object.fromEntries(next.map((r) => [r.id, r]));

  assert.equal(byId.a.expanded, true);
  assert.equal(byId.b.expanded, false);
});

test('CR-06  toggleExpanded возвращает запись обратно в свёрнутое состояние', () => {
  const list = prependRecording(createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 }), []);
  const next = toggleExpanded(toggleExpanded(list, 'a'), 'a');
  assert.equal(next[0].expanded, false);
});

test('CR-06  toggleExpanded не трогает аудио и расшифровку', () => {
  const list = prependRecording(createRecording({ id: 'a', audioUrl: 'blob:a', createdAt: 1 }), []);
  const next = toggleExpanded(list, 'a');
  assert.equal(next[0].audioUrl, 'blob:a');
  assert.equal(next[0].transcriptStatus, 'pending');
});
