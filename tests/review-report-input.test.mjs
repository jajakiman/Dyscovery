import assert from 'node:assert/strict';
import {
  saveReviewDraftInput,
  finalizeReviewInput,
  publishReportInput,
} from '../src/lib/assessment/review-report.ts';

// 1. Review draft validation
const validDraft = {
  taskAttemptId: '90000000-0000-4000-8000-000000000001',
  rubricResult: { accuracy: 90 },
  annotations: [
    {
      finding: 'substitution',
      note: 'Kata batu terbaca bata',
      evidenceLocation: { target: 'batu' },
      recordingId: '90000000-0000-4000-8000-000000000002',
    },
  ],
};
assert.deepEqual(saveReviewDraftInput(validDraft), validDraft);

for (const badDraft of [
  null,
  {},
  { ...validDraft, taskAttemptId: 'invalid' },
  { ...validDraft, rubricResult: 'not-object' },
  { ...validDraft, annotations: [{ finding: 'invalid_finding' }] },
  { ...validDraft, annotations: [{ finding: 'match', note: 'a'.repeat(1001) }] },
]) {
  assert.throws(() => saveReviewDraftInput(badDraft));
}

// 2. Finalize review validation
assert.deepEqual(
  finalizeReviewInput({ reviewRevisionId: '90000000-0000-4000-8000-000000000003' }),
  { reviewRevisionId: '90000000-0000-4000-8000-000000000003' }
);
assert.throws(() => finalizeReviewInput(null));
assert.throws(() => finalizeReviewInput({ reviewRevisionId: 'not-uuid' }));

// 3. Publish report validation
const validReport = {
  sessionId: '90000000-0000-4000-8000-000000000004',
  findingsSnapshot: { summary: 'Observasi selesai' },
  followUpText: 'Latihan pengenalan fonem r',
  followUpOrigin: 'teacher_manual',
  reviewRevisionIds: ['90000000-0000-4000-8000-000000000003'],
};
assert.deepEqual(publishReportInput(validReport), validReport);

for (const badReport of [
  null,
  {},
  { ...validReport, sessionId: 'bad' },
  { ...validReport, findingsSnapshot: 'not-obj' },
  { ...validReport, followUpOrigin: 'ai_generated' }, // Generative AI follow up is disallowed in MVP!
  { ...validReport, followUpText: 'a'.repeat(5001) },
  { ...validReport, reviewRevisionIds: ['not-a-uuid'] },
]) {
  assert.throws(() => publishReportInput(badReport));
}

console.log('Review and report input checks passed');
