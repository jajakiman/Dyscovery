import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const dispatchPath = new URL(
  '../src/app/api/assessment-sessions/[id]/ai/dispatch/route.ts',
  import.meta.url
);
const getPath = new URL(
  '../src/app/api/assessment-sessions/[id]/ai/route.ts',
  import.meta.url
);

assert.ok(existsSync(dispatchPath), 'AI dispatch route missing');
assert.ok(existsSync(getPath), 'AI get route missing');

let authenticated = true;
let rpcResult = { data: null, error: null };
let lastRpc = null;

globalThis.__aiEndpointMockClient = {
  auth: {
    async getUser() {
      return { data: { user: authenticated ? { id: 'teacher-user-id' } : null }, error: null };
    },
  },
  async rpc(name, params) {
    lastRpc = { name, params };
    return rpcResult;
  },
  from(table) {
    assert.ok(table);
    return {
      select() {
        return {
          eq() {
            return {
              async order() {
                return { data: [{ id: 'mock-ai-analysis-id', status: 'completed' }], error: null };
              },
            };
          },
        };
      },
    };
  },
};

const validatorUrl = new URL('../src/lib/assessment/ai.ts', import.meta.url).href;

function loadModule(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
    .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__aiEndpointMockClient;')
    .replace(/@\/lib\/assessment\/ai/, validatorUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const dispatchModule = await loadModule(dispatchPath);
const getModule = await loadModule(getPath);

const validSessionId = '90000000-0000-4000-8000-000000000001';
const validRecordingId = '90000000-0000-4000-8000-000000000002';
const validHeaders = { origin: 'https://dyscovery.vercel.app', 'content-type': 'application/json' };

// 1. Bad Origin check
{
  const badOrigin = await dispatchModule.POST(
    new Request('https://example.test', { method: 'POST', headers: { origin: 'https://evil.test' } }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(badOrigin.status, 403);
}

// 2. Provider gate disabled -> graceful fallback to manual review
{
  delete process.env.ENABLE_AI_PROCESSING;
  delete process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED;

  const fallbackRes = await dispatchModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        recordingId: validRecordingId,
        idempotencyKey: 'idempotent-test-key-001',
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(fallbackRes.status, 200);
  const body = await fallbackRes.json();
  assert.equal(body.status, 'fallback_to_manual');
}

// 3. Provider gate enabled
{
  process.env.ENABLE_AI_PROCESSING = 'true';
  process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED = 'true';

  // Consent missing (403)
  rpcResult = { data: null, error: { code: '42501' } };
  const noConsent = await dispatchModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        recordingId: validRecordingId,
        idempotencyKey: 'idempotent-test-key-002',
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(noConsent.status, 403);

  // Success dispatch and candidate generation
  rpcResult = {
    data: {
      analysisId: '90000000-0000-4000-8000-000000000003',
      status: 'queued',
      recordingId: validRecordingId,
    },
    error: null,
  };
  const okDispatch = await dispatchModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        recordingId: validRecordingId,
        idempotencyKey: 'idempotent-test-key-003',
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(okDispatch.status, 200);
  assert.equal(okDispatch.headers.get('cache-control'), 'private, no-store');
  const dispatchBody = await okDispatch.json();
  assert.equal(dispatchBody.status, 'completed');
  assert.equal(dispatchBody.candidateAnnotationsCount, 1);
  assert.ok(lastRpc);

  // Clean up env
  delete process.env.ENABLE_AI_PROCESSING;
  delete process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED;
}

// 4. GET AI candidates
{
  const okGet = await getModule.GET(new Request('https://example.test'), {
    params: Promise.resolve({ id: validSessionId }),
  });
  assert.equal(okGet.status, 200);
  assert.equal(okGet.headers.get('cache-control'), 'private, no-store');
}

delete globalThis.__aiEndpointMockClient;
console.log('Post-recording AI endpoint checks passed');
