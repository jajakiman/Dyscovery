import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.scripts['test:db:synthetic'], 'node scripts/test-db.mjs --service dyscovery-test');

const run = (...args) => spawnSync(process.execPath, ['scripts/test-db.mjs', ...args], { encoding: 'utf8' });
const list = run('--list');
assert.equal(list.status, 0, list.stderr);
assert.ok(list.stdout.includes('assessment-drafts.sql'));
assert.ok(!list.stdout.includes('seed-synthetic-practice.sql'));
assert.equal(list.stdout.trim().split('\n').length, 12);
const missing = run();
assert.notEqual(missing.status, 0);
assert.ok(missing.stderr.includes('--service'));
const invalid = run('--service', 'postgres://secret@example.test');
assert.notEqual(invalid.status, 0);
assert.ok(!invalid.stderr.includes('secret'));
console.log('SQL runner selection and configuration checks passed');
