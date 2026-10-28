import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const reviewsPath = new URL('../src/app/api/assessment-sessions/[id]/reviews/route.ts', import.meta.url);
const finalizePath = new URL('../src/app/api/assessment-sessions/[id]/reviews/finalize/route.ts', import.meta.url);
const reportsPath = new URL('../src/app/api/assessment-sessions/[id]/reports/route.ts', import.meta.url);

assert.ok(existsSync(reviewsPath), 'Reviews route missing');
assert.ok(existsSync(finalizePath), 'Finalize route missing');
assert.ok(existsSync(reportsPath), 'Reports route missing');

let authenticated = true;
let rpcResult = { data: null, error: null };
let lastRpc = null;

globalThis.__reviewReportMockClient = {
  auth: {
    async getUser() {
      return { data: { user: authenticated ? { id: 'test-user-id' } : null }, error: null };
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
                return { data: [{ id: 'mock-report-id', status: 'published' }], error: null };
              },
            };
          },
          async order() {
            return { data: [{ id: 'mock-revision-id', status: 'draft' }], error: null };
          },
        };
      },
    };
  },
};

const validatorUrl = new URL('../src/lib/assessment/review-report.ts', import.meta.url).href;

function loadModule(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
    .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__reviewReportMockClient;')
    .replace(/@\/lib\/assessment\/review-report/, validatorUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const reviewsModule = await loadModule(reviewsPath);
const finalizeModule = await loadModule(finalizePath);
const reportsModule = await loadModule(reportsPath);

const validSessionId = '90000000-0000-4000-8000-000000000010';
const validAttemptId = '90000000-0000-4000-8000-000000000011';
const validRevisionId = '90000000-0000-4000-8000-000000000012';
const validHeaders = { origin: 'https://dyscovery.vercel.app', 'content-type': 'application/json' };

// 1. Test Reviews Route
{
  // Bad Origin
  const badOrigin = await reviewsModule.POST(
    new Request('https://example.test', { method: 'POST', headers: { origin: 'https://evil.test' } }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(badOrigin.status, 403);

  // Success Draft Save
  rpcResult = { data: validRevisionId, error: null };
  const okDraft = await reviewsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        taskAttemptId: validAttemptId,
        rubricResult: { score: 90 },
        annotations: [{ finding: 'substitution', note: 'Catatan guru' }],
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(okDraft.status, 200);
  assert.equal(okDraft.headers.get('cache-control'), 'private, no-store');
  assert.equal(lastRpc.name, 'save_review_draft');
}

// 2. Test Finalize Review Route
{
  rpcResult = { data: validRevisionId, error: null };
  const okFinalize = await finalizeModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ reviewRevisionId: validRevisionId }),
    })
  );
  assert.equal(okFinalize.status, 200);
  assert.equal(lastRpc.name, 'finalize_review_revision');
}

// 3. Test Publish Report Route
{
  // Not completed session error (400)
  rpcResult = { data: null, error: { code: '22023' } };
  const incomplete = await reportsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        findingsSnapshot: { summary: 'Hasil observasi' },
        followUpText: 'Saran guru',
        followUpOrigin: 'teacher_manual',
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(incomplete.status, 400);

  // Success Publish
  rpcResult = { data: { reportVersionId: 'report-1', version: 1, status: 'published' }, error: null };
  const okPublish = await reportsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        findingsSnapshot: { summary: 'Hasil observasi lengkap' },
        followUpText: 'Penguatan fonologis terarah',
        followUpOrigin: 'teacher_manual',
        reviewRevisionIds: [validRevisionId],
      }),
    }),
    { params: Promise.resolve({ id: validSessionId }) }
  );
  assert.equal(okPublish.status, 200);
  assert.equal(okPublish.headers.get('cache-control'), 'private, no-store');
  assert.equal(lastRpc.name, 'publish_observation_report');

  // List reports GET
  const okGet = await reportsModule.GET(new Request('https://example.test'), {
    params: Promise.resolve({ id: validSessionId }),
  });
  assert.equal(okGet.status, 200);
  assert.equal(okGet.headers.get('cache-control'), 'private, no-store');
}

delete globalThis.__reviewReportMockClient;
console.log('Review and report endpoints checks passed');
