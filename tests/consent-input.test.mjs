import assert from 'node:assert/strict';
import { consentInput } from '../src/lib/consent/input.ts';

const valid = { guardianLinkId: '60000000-0000-4000-8000-000000000021', purpose: 'activity',
  decision: 'grant', noticeVersion: 'v1', processingScopeVersion: 's1', confirmed: true };
assert.deepEqual(consentInput(valid), valid);
for (const change of [{ confirmed: false }, { confirmed: undefined }, { guardianLinkId: 'invalid' },
  { purpose: 'report' }, { decision: 'yes' }, { noticeVersion: '' }, { processingScopeVersion: 'x'.repeat(81) }]) {
  assert.throws(() => consentInput({ ...valid, ...change }));
}
for (const input of [null, [], {}, 'grant']) assert.throws(() => consentInput(input));
for (const decision of ['deny', 'withdraw']) assert.equal(consentInput({ ...valid, decision }).decision, decision);
console.log('Consent input checks passed');
