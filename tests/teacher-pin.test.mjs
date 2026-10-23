import assert from 'node:assert/strict';
import { teacherPin } from '../src/lib/auth/teacher-pin.ts';
assert.equal(teacherPin({ pin: '012345' }), '012345');
for (const input of [null, {}, { pin: 123456 }, { pin: '12345' }, { pin: '1234567' }, { pin: 'abcdef' }]) {
  assert.throws(() => teacherPin(input));
}
console.log('Teacher PIN input checks passed');
