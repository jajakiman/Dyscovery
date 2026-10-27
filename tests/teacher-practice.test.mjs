import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const path = new URL('../src/app/api/assessment-sessions/[id]/practice/route.ts', import.meta.url);
assert.ok(existsSync(path), 'Teacher practice endpoint is missing');
let result = { data: { id: '90000000-0000-4000-8000-000000000001', practice_responses: [] }, error: null };
let authenticated = true;
let queries = 0;
const query = {
  select(columns) {
    assert.equal(columns, 'id,status,practice_responses(item_key,response,created_at)');
    return this;
  },
  eq(column, value) { assert.equal(column, 'id'); assert.equal(value, result.data?.id ?? id); return this; },
  async maybeSingle() { return result; },
};
globalThis.__teacherPracticeClient = {
  auth: { async getUser() { return { data: { user: authenticated ? { id: 'teacher' } : null }, error: null }; } },
  from(table) { queries++; assert.equal(table, 'assessment_sessions'); return query; },
};
const source = readFileSync(path, 'utf8')
  .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
  .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__teacherPracticeClient;');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const id = result.data.id;
const call = (value = id) => GET(new Request('https://example.test'), { params: Promise.resolve({ id: value }) });
assert.equal((await call('bad')).status, 400);
assert.equal(queries, 0);
authenticated = false;
assert.equal((await call()).status, 401);
assert.equal(queries, 0);
authenticated = true;
const response = await call();
assert.equal(response.status, 200);
assert.equal(response.headers.get('cache-control'), 'private, no-store');
assert.deepEqual(await response.json(), { session: result.data });
result = { data: null, error: null };
assert.equal((await call()).status, 404);
result = { data: null, error: { message: 'private database details' } };
const failed = await call();
assert.equal(failed.status, 503);
assert.ok(!(await failed.text()).includes('private database details'));
delete globalThis.__teacherPracticeClient;
console.log('Teacher practice endpoint checks passed (database boundary stubbed; RLS requires SQL testing)');
