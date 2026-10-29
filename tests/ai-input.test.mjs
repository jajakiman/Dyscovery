import assert from 'node:assert/strict';
import {
  requestAiAnalysisInput,
  recordAiResultsInput,
  checkAiProviderGate,
  computeReadingScore,
  generateReadingCandidateAnnotations,
} from '../src/lib/assessment/ai.ts';

// 1. Request AI Analysis input checks
const validReq = {
  recordingId: '90000000-0000-4000-8000-000000000001',
  idempotencyKey: 'asr-key-90000000-0000-4000-8000-000000000001',
};
assert.deepEqual(requestAiAnalysisInput(validReq), validReq);

for (const badReq of [
  null,
  {},
  { ...validReq, recordingId: 'bad' },
  { ...validReq, idempotencyKey: 'short' }, // < 10 chars
  { ...validReq, idempotencyKey: 'invalid chars !@#' },
]) {
  assert.throws(() => requestAiAnalysisInput(badReq));
}

// 2. Record AI Results input checks
const validResults = {
  analysisId: '90000000-0000-4000-8000-000000000002',
  status: 'completed',
  processingLatencyMs: 4200,
  annotations: [
    {
      referenceStart: 0,
      referenceEnd: 6,
      audioStartMs: 250,
      audioEndMs: 1100,
      annotationType: 'match',
      observedText: 'Kancil',
      confidenceScore: 0.94,
    },
  ],
};
assert.deepEqual(recordAiResultsInput(validResults), validResults);

for (const badRes of [
  null,
  { ...validResults, analysisId: 'invalid' },
  { ...validResults, status: 'invalid_status' },
  { ...validResults, processingLatencyMs: -10 },
  { ...validResults, processingLatencyMs: 90000 },
  { ...validResults, annotations: [{ annotationType: 'not_an_annotation' }] },
  { ...validResults, annotations: [{ annotationType: 'match', confidenceScore: 1.5 }] },
]) {
  assert.throws(() => recordAiResultsInput(badRes));
}

// 3. Provider gate checks
{
  const oldEnable = process.env.ENABLE_AI_PROCESSING;
  const oldConfirm = process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED;

  // Disabled by default
  delete process.env.ENABLE_AI_PROCESSING;
  delete process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED;
  const defaultGate = checkAiProviderGate();
  assert.equal(defaultGate.allowed, false);
  assert.equal(defaultGate.fallback, true);
  assert.ok(defaultGate.reason.includes('manual'));

  // Enabled only when both env vars are true
  process.env.ENABLE_AI_PROCESSING = 'true';
  process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED = 'false';
  assert.equal(checkAiProviderGate().allowed, false);

  process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED = 'true';
  assert.equal(checkAiProviderGate().allowed, true);

  // Restore env
  if (oldEnable) process.env.ENABLE_AI_PROCESSING = oldEnable;
  else delete process.env.ENABLE_AI_PROCESSING;
  if (oldConfirm) process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED = oldConfirm;
  else delete process.env.AI_PROVIDER_COMPLIANCE_CONFIRMED;
}

// 4. Reading score calculation and candidate annotations
{
  const anns = generateReadingCandidateAnnotations('Kancil melihat pohon rindang di pinggir hutan', 8000);
  assert.equal(anns.length, 7);
  assert.equal(anns[0].observedText, 'Kancil');
  assert.equal(anns[0].annotationType, 'match');

  const score = computeReadingScore(anns, 8000);
  assert.equal(score.totalWords, 7);
  assert.ok(score.accuracyScore > 50 && score.accuracyScore <= 100);
  assert.ok(score.fluencyWpm > 0);
}

console.log('AI analysis input and provider gate checks passed');
