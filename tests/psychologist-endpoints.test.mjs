import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const directoryPath = new URL('../src/app/api/psychologists/route.ts', import.meta.url);
const sharesPath = new URL('../src/app/api/reports/[id]/shares/route.ts', import.meta.url);
const shareRevokePath = new URL('../src/app/api/reports/[id]/shares/[shareId]/route.ts', import.meta.url);
const consultationsPath = new URL('../src/app/api/consultations/route.ts', import.meta.url);

assert.ok(existsSync(directoryPath), 'Psychologist directory route missing');
assert.ok(existsSync(sharesPath), 'Report shares route missing');
assert.ok(existsSync(shareRevokePath), 'Share revoke route missing');
assert.ok(existsSync(consultationsPath), 'Consultations route missing');

let authenticated = true;
let rpcResult = { data: null, error: null };
let lastRpc = null;

globalThis.__psychologistMockClient = {
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
            return Promise.resolve({
              data: [
                {
                  profile_id: '80000000-0000-4000-8000-000000000002',
                  credential_id: 'STR-12345678',
                  verification_status: 'verified',
                },
              ],
              error: null,
            });
          },
          order() {
            return Promise.resolve({
              data: [{ id: 'mock-consultation-id', status: 'pending' }],
              error: null,
            });
          },
        };
      },
    };
  },
};

const validatorUrl = new URL('../src/lib/psychologist/directory-share.ts', import.meta.url).href;

function loadModule(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
    .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__psychologistMockClient;')
    .replace(/@\/lib\/psychologist\/directory-share/, validatorUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const directoryModule = await loadModule(directoryPath);
const sharesModule = await loadModule(sharesPath);
const shareRevokeModule = await loadModule(shareRevokePath);
const consultationsModule = await loadModule(consultationsPath);

const validReportId = '70000000-0000-4000-8000-000000000001';
const validPsychologistId = '80000000-0000-4000-8000-000000000002';
const validChildId = '90000000-0000-4000-8000-000000000003';
const validShareId = 'a0000000-0000-4000-8000-000000000004';
const validReqId = 'b0000000-0000-4000-8000-000000000005';
const validHeaders = { origin: 'https://dyscovery.vercel.app', 'content-type': 'application/json' };
const futureDate = new Date(Date.now() + 86400000 * 14).toISOString();

// 1. Directory GET
{
  const okDir = await directoryModule.GET();
  assert.equal(okDir.status, 200);
  assert.equal(okDir.headers.get('cache-control'), 'private, no-store');
  const body = await okDir.json();
  assert.equal(body.psychologists.length, 1);
}

// 2. Shares POST (grant) & GET
{
  // Origin check
  const badOrigin = await sharesModule.POST(
    new Request('https://example.test', { method: 'POST', headers: { origin: 'https://evil.test' } }),
    { params: Promise.resolve({ id: validReportId }) }
  );
  assert.equal(badOrigin.status, 403);

  // Success grant
  rpcResult = { data: validShareId, error: null };
  const okGrant = await sharesModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        psychologistId: validPsychologistId,
        noticeVersion: 'share-v1',
        expiresAt: futureDate,
        includeAudio: false,
      }),
    }),
    { params: Promise.resolve({ id: validReportId }) }
  );
  assert.equal(okGrant.status, 200);
  assert.equal(okGrant.headers.get('cache-control'), 'private, no-store');
  const grantBody = await okGrant.json();
  assert.equal(grantBody.shareId, validShareId);
  assert.equal(grantBody.includeAudio, false);
  assert.ok(lastRpc);

  // Shares list GET
  const okList = await sharesModule.GET(
    new Request('https://example.test'),
    { params: Promise.resolve({ id: validReportId }) }
  );
  assert.equal(okList.status, 200);
  assert.equal(okList.headers.get('cache-control'), 'private, no-store');
}

// 3. Share Revoke DELETE
{
  // Bad Origin
  const badOrigin = await shareRevokeModule.DELETE(
    new Request('https://example.test', { method: 'DELETE', headers: { origin: 'https://evil.test' } }),
    { params: Promise.resolve({ id: validReportId, shareId: validShareId }) }
  );
  assert.equal(badOrigin.status, 403);

  // Success Revoke
  rpcResult = { data: true, error: null };
  const okRevoke = await shareRevokeModule.DELETE(
    new Request('https://example.test', { method: 'DELETE', headers: validHeaders }),
    { params: Promise.resolve({ id: validReportId, shareId: validShareId }) }
  );
  assert.equal(okRevoke.status, 200);
  assert.equal(okRevoke.headers.get('cache-control'), 'private, no-store');
  const revokeBody = await okRevoke.json();
  assert.equal(revokeBody.status, 'revoked');
  assert.ok(lastRpc);
}

// 4. Consultation Requests (POST, GET, PATCH)
{
  // POST create consultation
  rpcResult = { data: validReqId, error: null };
  const okCreate = await consultationsModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        psychologistId: validPsychologistId,
        childId: validChildId,
        reportShareId: validShareId,
        requestedTime: futureDate,
        notes: 'Catatan konsultasi awal',
      }),
    })
  );
  assert.equal(okCreate.status, 200);
  assert.equal(okCreate.headers.get('cache-control'), 'private, no-store');
  const createBody = await okCreate.json();
  assert.equal(createBody.consultationRequestId, validReqId);
  assert.equal(createBody.status, 'pending');

  // GET list consultations
  const okList = await consultationsModule.GET();
  assert.equal(okList.status, 200);
  assert.equal(okList.headers.get('cache-control'), 'private, no-store');

  // PATCH respond consultation
  rpcResult = { data: true, error: null };
  const okRespond = await consultationsModule.PATCH(
    new Request('https://example.test', {
      method: 'PATCH',
      headers: validHeaders,
      body: JSON.stringify({
        requestId: validReqId,
        status: 'accepted',
      }),
    })
  );
  assert.equal(okRespond.status, 200);
  assert.equal(okRespond.headers.get('cache-control'), 'private, no-store');
  const respondBody = await okRespond.json();
  assert.equal(respondBody.status, 'accepted');
}

delete globalThis.__psychologistMockClient;
console.log('Psychologist directory, report share, and consultation endpoint checks passed');
