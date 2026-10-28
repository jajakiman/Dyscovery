import assert from 'node:assert/strict';
import {
  sessionLifecycleIdInput,
  sessionEventInput,
  taskAttemptInput,
} from '../src/lib/assessment/lifecycle.ts';

// 1. Session ID validation
const validSession = { sessionId: '90000000-0000-4000-8000-000000000001' };
assert.deepEqual(sessionLifecycleIdInput(validSession), validSession);
for (const bad of [null, undefined, {}, { sessionId: 'bad-uuid' }, { sessionId: 12345 }]) {
  assert.throws(() => sessionLifecycleIdInput(bad));
}

// 2. Session event validation
const validEvent = {
  sessionId: '90000000-0000-4000-8000-000000000001',
  eventType: 'pause_requested',
  note: 'Siswa minta istirahat sebentar',
};
assert.deepEqual(sessionEventInput(validEvent), validEvent);
assert.deepEqual(sessionEventInput({ ...validEvent, note: undefined }), {
  sessionId: validEvent.sessionId,
  eventType: validEvent.eventType,
  note: undefined,
});

for (const badEvent of [
  null,
  { ...validEvent, sessionId: 'invalid' },
  { ...validEvent, eventType: 'invalid_event' },
  { ...validEvent, note: 'a'.repeat(501) },
  { ...validEvent, note: '   ' },
]) {
  assert.throws(() => sessionEventInput(badEvent));
}

// 3. Task attempt validation
const validAttempt = {
  itemKey: 'pos1-letter-arrange',
  encounterType: 'letter_arrange',
  phase: 'screening',
  response: { arranged: ['B', 'A', 'T', 'U'] },
  requestId: '90000000-0000-4000-8000-000000000088',
  attemptNumber: 1,
};
assert.deepEqual(taskAttemptInput(validAttempt), validAttempt);
assert.deepEqual(
  taskAttemptInput({
    itemKey: 'pos3-word',
    encounterType: 'word_read',
    phase: 'screening',
    requestId: '90000000-0000-4000-8000-000000000089',
  }),
  {
    itemKey: 'pos3-word',
    encounterType: 'word_read',
    phase: 'screening',
    response: null,
    requestId: '90000000-0000-4000-8000-000000000089',
    attemptNumber: 1,
  }
);

for (const badAttempt of [
  null,
  { ...validAttempt, itemKey: 'Invalid Key!' },
  { ...validAttempt, encounterType: 'not_an_encounter' },
  { ...validAttempt, phase: 'not_a_phase' },
  { ...validAttempt, requestId: 'not-uuid' },
  { ...validAttempt, attemptNumber: 0 },
  { ...validAttempt, attemptNumber: -1 },
  { ...validAttempt, attemptNumber: 1.5 },
  { ...validAttempt, response: { huge: 'a'.repeat(5000) } },
]) {
  assert.throws(() => taskAttemptInput(badAttempt));
}

console.log('Session lifecycle and task attempt input checks passed');
