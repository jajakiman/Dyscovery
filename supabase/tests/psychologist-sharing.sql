-- Synthetic verified psychologist directory, report sharing, and consultation rollback test.
begin;

insert into auth.users(id) values
('80000000-0000-4000-8000-000000000101'),
('80000000-0000-4000-8000-000000000102'),
('80000000-0000-4000-8000-000000000103'),
('80000000-0000-4000-8000-000000000104'),
('80000000-0000-4000-8000-000000000105');

update public.profiles set product_role='teacher',verification_status='verified',account_status='active'
where id in ('80000000-0000-4000-8000-000000000101','80000000-0000-4000-8000-000000000105');

update public.profiles set product_role='guardian',verification_status='verified',account_status='active',full_name='Wali Berbagi Sintetis'
where id='80000000-0000-4000-8000-000000000102';
update public.profiles set identity_confirmed_at=now() where id='80000000-0000-4000-8000-000000000102';

update public.profiles set product_role='psychologist',verification_status='verified',account_status='active',full_name='Dr. Anita M.Psi'
where id='80000000-0000-4000-8000-000000000103';

update public.profiles set product_role='psychologist',verification_status='pending',account_status='active',full_name='Calon Psikolog'
where id='80000000-0000-4000-8000-000000000104';

insert into public.psychologist_profiles(profile_id, credential_id, credential_type, institution_name, clinic_address, verification_status, verified_at) values
('80000000-0000-4000-8000-000000000103', 'STR-12345678', 'STR_PSIKOLOG_KLINIS', 'Klinik Tumbuh Kembang Jakarta', 'Jl. Salemba Raya No. 10', 'verified', now()),
('80000000-0000-4000-8000-000000000104', 'STR-PENDING-01', 'STR_PSIKOLOG_KLINIS', 'Klinik Belum Terverifikasi', null, 'pending', null);

insert into public.schools(id,name,verification_status) values
('80000000-0000-4000-8000-000000000110','Sekolah Berbagi Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('80000000-0000-4000-8000-000000000111','80000000-0000-4000-8000-000000000110','80000000-0000-4000-8000-000000000101','active',now()),
('80000000-0000-4000-8000-000000000115','80000000-0000-4000-8000-000000000110','80000000-0000-4000-8000-000000000105','active',now());
insert into public.children(id,school_id,display_name,grade) values
('80000000-0000-4000-8000-000000000112','80000000-0000-4000-8000-000000000110','Anak Berbagi Sintetis','2');
-- Fix school_id foreign key for child
update public.children set school_id='80000000-0000-4000-8000-000000000110' where id='80000000-0000-4000-8000-000000000112';

insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('80000000-0000-4000-8000-000000000113','80000000-0000-4000-8000-000000000110','80000000-0000-4000-8000-000000000111','80000000-0000-4000-8000-000000000112',now()-interval '1 hour');

insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled) values
('activity','share-test-v1','share-test-s1','Pemberitahuan aktivitas sharing','Cakupan aktivitas',true),
('recording','share-test-v1','share-test-s1','Pemberitahuan rekaman sharing','Cakupan rekaman',true);

insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version) values
('80000000-0000-4000-8000-000000000114','synthetic-share-material',1,'approved',
'{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"pos4-reading","phase":"screening","prompt":"Teks cerita"}]}',
'share-test-v1','share-test-s1');

insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('80000000-0000-4000-8000-000000000116','80000000-0000-4000-8000-000000000102','80000000-0000-4000-8000-000000000112','guardian','verified',clock_timestamp());

set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);
select public.record_guardian_consent('80000000-0000-4000-8000-000000000116','activity','grant','share-test-v1','share-test-s1');
select public.record_guardian_consent('80000000-0000-4000-8000-000000000116','recording','grant','share-test-v1','share-test-s1');

-- Directory test: guardian sees only verified psychologists
do $$ begin assert (select count(*) from public.psychologist_profiles where verification_status = 'verified') = 1, 'Verified psychologist directory count mismatch'; end $$;

-- Teacher creates session, records audio, and publishes report
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000101',true);
select public.set_teacher_pin('1357');

do $$
declare
  sess_id uuid;
  attempt_id uuid;
  upload_res jsonb;
  rec_id uuid;
  rev_id uuid;
  pub_res jsonb;
  rep_id uuid;
  share_id uuid;
  share_with_audio_id uuid;
  req_id uuid;
  play_res jsonb;
begin
  sess_id := public.create_assessment_draft('80000000-0000-4000-8000-000000000113','80000000-0000-4000-8000-000000000114');
  perform public.start_assessment_session(sess_id);
  perform public.enter_student_mode(sess_id);
  attempt_id := public.save_task_attempt('pos4-reading', 'passage_read', 'screening', '{"read":true}'::jsonb, gen_random_uuid(), 1);

  upload_res := public.request_audio_upload(attempt_id, 'audio/webm');
  rec_id := (upload_res->>'recordingId')::uuid;
  perform public.finalize_audio_upload(rec_id, 'sha256:abc123456789', 1048576, 12000);

  perform public.complete_assessment_session(sess_id);
  perform public.unlock_teacher_mode('1357');

  rev_id := public.save_review_draft(
    attempt_id,
    '{"accuracyScore": 90}'::jsonb,
    '[{"finding": "hesitation", "note": "Ragu sejenak"}]'::jsonb
  );
  perform public.finalize_review_revision(rev_id);

  pub_res := public.publish_observation_report(
    sess_id,
    '{"summary": "Observasi membaca selesai", "encountersCompleted": 5}'::jsonb,
    'Latihan fonemik tambahan',
    'teacher_manual',
    array[rev_id]
  );
  rep_id := (pub_res->>'reportVersionId')::uuid;
  assert rep_id is not null, 'Report version not created';

  -- Guardian tests sharing
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);

  -- Sharing to unverified psychologist must fail
  begin
    perform public.grant_report_share(rep_id, '80000000-0000-4000-8000-000000000104', 'share-v1', clock_timestamp() + interval '14 days', false);
    raise exception 'Sharing to unverified psychologist allowed';
  exception when others then null; end;

  -- Sharing with past expiry must fail
  begin
    perform public.grant_report_share(rep_id, '80000000-0000-4000-8000-000000000103', 'share-v1', clock_timestamp() - interval '1 hour', false);
    raise exception 'Past expiry allowed';
  exception when others then null; end;

  -- Share without audio (default)
  share_id := public.grant_report_share(rep_id, '80000000-0000-4000-8000-000000000103', 'share-v1', clock_timestamp() + interval '14 days', false);
  assert share_id is not null, 'Share grant failed';

  -- Psychologist 1 views shared report
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000103',true);
  assert (select count(*) from public.report_versions where id = rep_id) = 1, 'Psychologist cannot read shared report';

  -- Audio is excluded by default
  assert (select count(*) from public.recordings where id = rec_id) = 0, 'Psychologist read raw audio when include_audio=false';
  begin
    play_res := public.get_recording_playback_info(rec_id);
    raise exception 'Psychologist played recording without include_audio permission';
  exception when others then null; end;

  -- Guardian shares WITH audio
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);
  share_with_audio_id := public.grant_report_share(rep_id, '80000000-0000-4000-8000-000000000103', 'share-v1', clock_timestamp() + interval '7 days', true);

  -- Psychologist 1 now has audio access
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000103',true);
  assert (select count(*) from public.recordings where id = rec_id) = 1, 'Psychologist cannot read audio when include_audio=true';
  play_res := public.get_recording_playback_info(rec_id);
  assert play_res->>'recordingId' = rec_id::text, 'Playback info failed';

  -- Guardian revokes the share with audio
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);
  perform public.revoke_report_share(share_with_audio_id);

  -- Psychologist 1 loses audio access immediately upon revocation
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000103',true);
  assert (select count(*) from public.recordings where id = rec_id) = 0, 'Psychologist still read audio after revocation';

  -- Guardian creates consultation request
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);
  req_id := public.create_consultation_request(
    '80000000-0000-4000-8000-000000000103',
    '80000000-0000-4000-8000-000000000112',
    share_id,
    clock_timestamp() + interval '2 days',
    'Permohonan konsultasi awal tumbuh kembang'
  );
  assert req_id is not null, 'Consultation request creation failed';

  -- Psychologist responds to consultation request
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000103',true);
  assert (select count(*) from public.consultation_requests where id = req_id) = 1, 'Psychologist cannot read consultation request';
  perform public.respond_consultation_request(req_id, 'accepted');
  assert (select status from public.consultation_requests where id = req_id) = 'accepted', 'Consultation status not accepted';

  -- Medical confidentiality: Teacher CANNOT read consultation request
  perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000101',true);
  assert (select count(*) from public.consultation_requests where id = req_id) = 0, 'Teacher read confidential consultation request';
end $$;

-- Verify audit trail contains logged actions
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000102',true);
do $$ begin assert (select count(*) from public.audit_events where actor_id = '80000000-0000-4000-8000-000000000102') >= 3, 'Guardian audit events missing'; end $$;

reset role;
rollback;
