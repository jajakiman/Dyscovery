import assert from 'node:assert/strict';
import {
  audioUploadRequestInput,
  audioFinalizeInput,
  audioPlaybackInput,
} from '../src/lib/assessment/audio.ts';

// 1. Upload request validation
const validUpload = {
  taskAttemptId: '90000000-0000-4000-8000-000000000001',
  mimeType: 'audio/webm',
};
assert.deepEqual(audioUploadRequestInput(validUpload), validUpload);

for (const bad of [
  null,
  {},
  { ...validUpload, taskAttemptId: 'bad' },
  { ...validUpload, mimeType: 'audio/mp3' },
  { ...validUpload, mimeType: 'video/mp4' },
]) {
  assert.throws(() => audioUploadRequestInput(bad));
}

// 2. Finalize validation
const validFinalize = {
  recordingId: '90000000-0000-4000-8000-000000000002',
  contentHash: 'a1b2c3d4e5f6g7h8i9j0hash12345678',
  byteSize: 1048576, // 1MB
  durationMs: 15000, // 15s
};
assert.deepEqual(audioFinalizeInput(validFinalize), validFinalize);

for (const badFinalize of [
  null,
  { ...validFinalize, recordingId: 'bad-id' },
  { ...validFinalize, contentHash: 'short' },
  { ...validFinalize, byteSize: 0 },
  { ...validFinalize, byteSize: 30000000 }, // > 25MB
  { ...validFinalize, durationMs: 50 }, // < 100ms
  { ...validFinalize, durationMs: 2000000 }, // > 30 mins
]) {
  assert.throws(() => audioFinalizeInput(badFinalize));
}

// 3. Playback input validation
const validPlayback = { recordingId: '90000000-0000-4000-8000-000000000003' };
assert.deepEqual(audioPlaybackInput(validPlayback), validPlayback);
for (const bad of [null, {}, { recordingId: 'invalid' }]) {
  assert.throws(() => audioPlaybackInput(bad));
}

console.log('Audio input checks passed');
