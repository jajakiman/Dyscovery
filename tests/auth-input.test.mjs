import assert from 'node:assert/strict';
import { credentials, identity } from '../src/lib/auth/input.ts';

assert.deepEqual(credentials({email: 'guru@example.com', password: '12345678'}), {email: 'guru@example.com', password: '12345678'});
for (const input of [null, {}, {email: 'invalid', password: '12345678'}, {email: 'a@b.co', password: 'short'}]) {
  assert.throws(() => credentials(input));
}
assert.deepEqual(identity({fullName: '  Éka  ', confirmed: true}), {fullName: 'Éka', displayName: 'Éka', nip: null});
assert.throws(() => identity({fullName: 'Guru', confirmed: false}));
assert.throws(() => identity({fullName: 'Guru', confirmed: true, nip: 123}));
assert.throws(() => identity({fullName: ' ', confirmed: true}));
assert.equal(identity({fullName: 'Guru', confirmed: true, nip: '012345678901234567'}).nip, '012345678901234567');
console.log('Auth input checks passed');
