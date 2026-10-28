import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const uploadPath = new URL('../src/app/api/student/audio/upload/route.ts', import.meta.url);
const finalizePath = new URL('../src/app/api/student/audio/finalize/route.ts', import.meta.url);
const playbackPath = new URL(
  '../src/app/api/assessment-sessions/[id]/recordings/[recordingId]/route.ts',
  import.meta.url
);

assert.ok(existsSync(uploadPath), 'Upload route missing');
assert.ok(existsSync(finalizePath), 'Finalize route missing');
assert.ok(existsSync(playbackPath), 'Playback route missing');

let authenticated = true;
let rpcResult = { data: null, error: null };
let lastRpc = null;

globalThis.__audioMockClient = {
  auth: {
    async getUser() {
      return { data: { user: authenticated ? { id: 'test-user-id' } : null }, error: null };
    },
  },
  async rpc(name, params) {
    lastRpc = { name, params };
    return rpcResult;
  },
  storage: {
    from(bucket) {
      assert.equal(bucket, 'private-recordings');
      return {
        async createSignedUploadUrl(key) {
          return { data: { signedUrl: `https://storage.test/upload/${key}`, token: 'mock-upload-token' }, error: null };
        },
        async createSignedUrl(key, expiresIn) {
          assert.equal(expiresIn, 60);
          return { data: { signedUrl: `https://storage.test/play/${key}?exp=${expiresIn}` }, error: null };
        },
      };
    },
  },
};

const audioValidatorUrl = new URL('../src/lib/assessment/audio.ts', import.meta.url).href;

function loadModule(path) {
  const source = readFileSync(path, 'utf8')
    .replace(/import .* from "next\/server";/, 'const NextResponse = { json: (body, options) => Response.json(body, options) };')
    .replace(/import .* from "@\/lib\/supabase\/server";/, 'const createClient = async () => globalThis.__audioMockClient;')
    .replace(/@\/lib\/assessment\/audio/, audioValidatorUrl);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

const uploadModule = await loadModule(uploadPath);
const finalizeModule = await loadModule(finalizePath);
const playbackModule = await loadModule(playbackPath);

const validAttemptId = '90000000-0000-4000-8000-000000000001';
const validRecordingId = '90000000-0000-4000-8000-000000000002';
const validSessionId = '90000000-0000-4000-8000-000000000003';
const validHeaders = { origin: 'https://dyscovery.vercel.app', 'content-type': 'application/json' };

// 1. Test Upload Route
{
  // Bad Origin
  const badOrigin = await uploadModule.POST(
    new Request('https://example.test', { method: 'POST', headers: { origin: 'https://evil.test' } })
  );
  assert.equal(badOrigin.status, 403);

  // Unauthenticated
  authenticated = false;
  const unauth = await uploadModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ taskAttemptId: validAttemptId, mimeType: 'audio/webm' }),
    })
  );
  assert.equal(unauth.status, 401);
  authenticated = true;

  // Consent missing (403)
  rpcResult = { data: null, error: { code: '42501' } };
  const noConsent = await uploadModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ taskAttemptId: validAttemptId, mimeType: 'audio/webm' }),
    })
  );
  assert.equal(noConsent.status, 403);

  // Success
  rpcResult = {
    data: {
      recordingId: validRecordingId,
      sessionId: validSessionId,
      storageObjectKey: `recordings/${validSessionId}/${validRecordingId}.webm`,
    },
    error: null,
  };
  const okUpload = await uploadModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ taskAttemptId: validAttemptId, mimeType: 'audio/webm' }),
    })
  );
  assert.equal(okUpload.status, 200);
  assert.equal(okUpload.headers.get('cache-control'), 'private, no-store');
  const uploadJson = await okUpload.json();
  assert.equal(uploadJson.recordingId, validRecordingId);
  assert.ok(uploadJson.signedUploadUrl.includes(validRecordingId));
  assert.equal(uploadJson.token, 'mock-upload-token');
}

// 2. Test Finalize Route
{
  rpcResult = { data: validRecordingId, error: null };
  const okFinalize = await finalizeModule.POST(
    new Request('https://example.test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        recordingId: validRecordingId,
        contentHash: 'abc123def456sha256hash',
        byteSize: 1048576,
        durationMs: 14200,
      }),
    })
  );
  assert.equal(okFinalize.status, 200);
  assert.equal(lastRpc.name, 'finalize_audio_upload');
  assert.equal(lastRpc.params.p_byte_size, 1048576);
}

// 3. Test Playback Route
{
  // Invalid ID
  const badId = await playbackModule.GET(new Request('https://example.test'), {
    params: Promise.resolve({ id: validSessionId, recordingId: 'not-a-uuid' }),
  });
  assert.equal(badId.status, 400);

  // Success
  rpcResult = {
    data: {
      recordingId: validRecordingId,
      sessionId: validSessionId,
      storageObjectKey: `recordings/${validSessionId}/${validRecordingId}.webm`,
      mimeType: 'audio/webm',
      durationMs: 14200,
      byteSize: 1048576,
      contentHash: 'abc123def456sha256hash',
    },
    error: null,
  };
  const okPlayback = await playbackModule.GET(new Request('https://example.test'), {
    params: Promise.resolve({ id: validSessionId, recordingId: validRecordingId }),
  });
  assert.equal(okPlayback.status, 200);
  assert.equal(okPlayback.headers.get('cache-control'), 'private, no-store');
  const playJson = await okPlayback.json();
  assert.equal(playJson.recordingId, validRecordingId);
  assert.ok(playJson.playbackUrl.includes('exp=60'));
}

delete globalThis.__audioMockClient;
console.log('Audio upload, finalize, and playback endpoint checks passed');
