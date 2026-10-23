import assert from 'node:assert/strict';
import { practiceInput } from '../src/lib/assessment/practice.ts';
const valid = { itemKey: 'practice-1', response: 'contoh', requestId: '90000000-0000-4000-8000-000000000099' };
assert.deepEqual(practiceInput(valid), valid);
for (const change of [{ itemKey: '' }, { response: '' }, { response: 'a'.repeat(501) }, { requestId: 'bad' }]) {
  assert.throws(() => practiceInput({ ...valid, ...change }));
}
assert.throws(() => practiceInput(null));
console.log('Practice input checks passed');
