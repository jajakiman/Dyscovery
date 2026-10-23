import assert from 'node:assert/strict';
import { sessionInput } from '../src/lib/assessment/input.ts';

const valid = { teacherAssignmentId: '70000000-0000-4000-8000-000000000001',
  materialVersionId: '70000000-0000-4000-8000-000000000002' };
assert.deepEqual(sessionInput(valid), valid);
for (const input of [null, [], {}, { ...valid, teacherAssignmentId: 'bad' },
  { ...valid, materialVersionId: 123 }]) assert.throws(() => sessionInput(input));
assert.deepEqual(sessionInput({ ...valid, status: 'completed', childId: 'other' }), valid);
console.log('Session input checks passed');
