import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

// Verify all files exist
const startPath = new URL('../src/app/api/assessment-sessions/[id]/start/route.ts', import.meta.url);
const completePath = new URL('../src/app/api/assessment-sessions/[id]/complete/route.ts', import.meta.url);
const eventsPath = new URL('../src/app/api/assessment-sessions/[id]/events/route.ts', import.meta.url);
const attemptsPath = new URL('../src/app/api/student/task-attempts/route.ts', import.meta.url);

assert.ok(existsSync(startPath), 'Start endpoint is missing');
assert.ok(existsSync(completePath), 'Complete endpoint is missing');
assert.ok(existsSync(eventsPath), 'Events endpoint is missing');
assert.ok(existsSync(attemptsPath), 'Task attempts endpoint is missing');

let authenticated = true;
let rpcMockResult = { data: 'mock-id-123', error: null };
let lastRpcCall = null;

globalThis.__lifecycleMockClient = {
  auth: {
    async getUser() {
      return { data: { user: authenticated ? { id: 'test-user-id' } : null }, error: null };
    },
  },
  async rpc(name, params) {
    lastRpcCall = { name, params };
    return rpcMockResult;
  },
};

const lifecycleUrl = new URL('../src/lib/assessment/lifecycle.ts', import.meta.url).href;

function loadModule(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
    .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__lifecycleMockClient;')
    .replace(/@\/lib\/assessment\/lifecycle/, lifecycleUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const startModule = await loadModule(startPath);
const completeModule = await loadModule(completePath);
const eventsModule = await loadModule(eventsPath);
const attemptsModule = await loadModule(attemptsPath);

const validId = '90000000-0000-4000-8000-000000000001';
const validHeaders = {
  origin: 'https://dyscovery.vercel.app',
  'content-type': 'application/json',
};

// --- 1. Test Start Session Endpoint ---
{
  // Bad Origin
  const badOrigin = await startModule.POST(
    new Request('https://example.test', { method: 'POST', headers: { origin: 'https://evil.test' } }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(badOrigin.status, 403);

  // Invalid ID
  const badId = await startModule.POST(
    new Request('https://example.test', { method: 'POST', headers: validHeaders }),
    { params: Promise.resolve({ id: 'not-a-uuid' }) }
  );
  assert.equal(badId.status, 400);

  // Unauthenticated
  authenticated = false;
  const unauth = await startModule.POST(
    new Request('https://example.test', { method: 'POST', headers: validHeaders }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(unauth.status, 401);
  authenticated = true;

  // Success
  rpcMockResult = { data: validId, error: null };
  const okResponse = await startModule.POST(
    new Request('https://example.test', { method: 'POST', headers: validHeaders }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(okResponse.status, 200);
  assert.equal(okResponse.headers.get('cache-control'), 'private, no-store');
  assert.equal(lastRpcCall.name, 'start_assessment_session');
  assert.equal(lastRpcCall.params.p_session_id, validId);
}

// --- 2. Test Complete Session Endpoint ---
{
  const okComplete = await completeModule.POST(
    new Request('https://example.test', { method: 'POST', headers: validHeaders }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(okComplete.status, 200);
  assert.equal(lastRpcCall.name, 'complete_assessment_session');
}

// --- 3. Test Session Events Endpoint ---
{
  // Valid event
  const okEvent = await eventsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ eventType: 'pause_requested', note: 'Istirahat minum' }),
    }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(okEvent.status, 200);
  assert.equal(lastRpcCall.name, 'record_session_event');
  assert.equal(lastRpcCall.params.p_event_type, 'pause_requested');
  assert.equal(lastRpcCall.params.p_note, 'Istirahat minum');

  // Invalid event type
  const badEvent = await eventsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ eventType: 'invalid_event' }),
    }),
    { params: Promise.resolve({ id: validId }) }
  );
  assert.equal(badEvent.status, 400);
}

// --- 4. Test Student Task Attempts Endpoint ---
{
  const okAttempt = await attemptsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        itemKey: 'pos1-letter-arrange',
        encounterType: 'letter_arrange',
        phase: 'screening',
        response: { arranged: ['B', 'A', 'T', 'U'] },
        requestId: '90000000-0000-4000-8000-000000000099',
      }),
    })
  );
  assert.equal(okAttempt.status, 200);
  assert.equal(lastRpcCall.name, 'save_task_attempt');
  assert.equal(lastRpcCall.params.p_item_key, 'pos1-letter-arrange');
  assert.equal(lastRpcCall.params.p_encounter_type, 'letter_arrange');
}

delete globalThis.__lifecycleMockClient;
console.log('Session lifecycle and task attempt endpoint checks passed');
