import assert from 'node:assert/strict';
import { teacherPin } from '../src/lib/auth/teacher-pin.ts';
assert.equal(teacherPin({ pin: '0123' }), '0123');
for (const input of [null, {}, { pin: 1234 }, { pin: '123' }, { pin: '12345' }, { pin: '123456' }, { pin: 'abcd' }]) {
  assert.throws(() => teacherPin(input));
}
console.log('Teacher PIN input checks passed');
