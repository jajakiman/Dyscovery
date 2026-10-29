import assert from 'node:assert/strict';
import {
  validateGrantShareInput,
  validateRevokeShareInput,
  validateCreateConsultationInput,
  validateRespondConsultationInput,
} from '../src/lib/psychologist/directory-share.ts';

const validReportId = '70000000-0000-4000-8000-000000000001';
const validPsychologistId = '80000000-0000-4000-8000-000000000002';
const validChildId = '90000000-0000-4000-8000-000000000003';
const validShareId = 'a0000000-0000-4000-8000-000000000004';
const futureDate = new Date(Date.now() + 86400000 * 14).toISOString();
const pastDate = new Date(Date.now() - 3600000).toISOString();

// 1. validateGrantShareInput tests
{
  // Valid grant share with audio = false by default
  const res = validateGrantShareInput({
    reportVersionId: validReportId,
    psychologistId: validPsychologistId,
    noticeVersion: 'share-v1',
    expiresAt: futureDate,
  });
  assert.equal(res.reportVersionId, validReportId);
  assert.equal(res.psychologistId, validPsychologistId);
  assert.equal(res.includeAudio, false, 'Audio must default to false');
  assert.equal(res.expiresAt, futureDate);

  // Explicit audio inclusion
  const resAudio = validateGrantShareInput({
    reportVersionId: validReportId,
    psychologistId: validPsychologistId,
    noticeVersion: 'share-v1',
    expiresAt: futureDate,
    includeAudio: true,
  });
  assert.equal(resAudio.includeAudio, true);

  // Past expiry rejection
  assert.throws(() => {
    validateGrantShareInput({
      reportVersionId: validReportId,
      psychologistId: validPsychologistId,
      noticeVersion: 'share-v1',
      expiresAt: pastDate,
    });
  }, /masa mendatang/);

  // Invalid UUID rejection
  assert.throws(() => {
    validateGrantShareInput({
      reportVersionId: 'not-a-uuid',
      psychologistId: validPsychologistId,
      noticeVersion: 'share-v1',
      expiresAt: futureDate,
    });
  }, /laporan tidak valid/);

  // Missing expiresAt
  assert.throws(() => {
    validateGrantShareInput({
      reportVersionId: validReportId,
      psychologistId: validPsychologistId,
      noticeVersion: 'share-v1',
    });
  }, /kedaluwarsa/);
}

// 2. validateRevokeShareInput tests
{
  const res = validateRevokeShareInput({ shareId: validShareId });
  assert.equal(res.shareId, validShareId);

  assert.throws(() => {
    validateRevokeShareInput({ shareId: 'bad-id' });
  }, /izin berbagi tidak valid/);
}

// 3. validateCreateConsultationInput tests
{
  const res = validateCreateConsultationInput({
    psychologistId: validPsychologistId,
    childId: validChildId,
    reportShareId: validShareId,
    requestedTime: futureDate,
    notes: 'Konsultasi awal evaluasi fonologi',
  });
  assert.equal(res.psychologistId, validPsychologistId);
  assert.equal(res.childId, validChildId);
  assert.equal(res.reportShareId, validShareId);
  assert.equal(res.notes, 'Konsultasi awal evaluasi fonologi');

  // Too long notes
  assert.throws(() => {
    validateCreateConsultationInput({
      psychologistId: validPsychologistId,
      childId: validChildId,
      notes: 'a'.repeat(2001),
    });
  }, /2000 karakter/);
}

// 4. validateRespondConsultationInput tests
{
  const res = validateRespondConsultationInput({
    requestId: validShareId,
    status: 'accepted',
  });
  assert.equal(res.status, 'accepted');

  assert.throws(() => {
    validateRespondConsultationInput({
      requestId: validShareId,
      status: 'pending', // Only accepted/declined/completed allowed
    });
  }, /Status konsultasi tidak valid/);
}

console.log('Psychologist directory and report sharing input checks passed');
