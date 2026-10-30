-- Synthetic private audio vault and recording authorization rollback test.
begin;
insert into auth.users(id) values
('70000000-0000-4000-8000-000000000090'),
('70000000-0000-4000-8000-000000000091'),
('70000000-0000-4000-8000-000000000092');

update public.profiles set product_role='teacher',verification_status='verified',account_status='active'
where id in ('70000000-0000-4000-8000-000000000090','70000000-0000-4000-8000-000000000092');
update public.profiles set product_role='guardian',verification_status='verified',account_status='active',full_name='Wali Audio Sintetis'
where id='70000000-0000-4000-8000-000000000091';
update public.profiles set identity_confirmed_at=now() where id='70000000-0000-4000-8000-000000000091';

insert into public.schools(id,name,verification_status) values
('70000000-0000-4000-8000-000000000100','Sekolah Audio Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('70000000-0000-4000-8000-000000000101','70000000-0000-4000-8000-000000000100','70000000-0000-4000-8000-000000000090','active',now()),
('70000000-0000-4000-8000-000000000103','70000000-0000-4000-8000-000000000100','70000000-0000-4000-8000-000000000092','active',now());
insert into public.children(id,school_id,display_name,grade) values
('70000000-0000-4000-8000-000000000102','70000000-0000-4000-8000-000000000100','Anak Audio Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('70000000-0000-4000-8000-000000000111','70000000-0000-4000-8000-000000000100','70000000-0000-4000-8000-000000000101','70000000-0000-4000-8000-000000000102',now()-interval '1 hour');

insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled) values
('activity','audio-test-v1','audio-test-s1','Pemberitahuan aktivitas audio','Cakupan aktivitas',true),
('recording','audio-test-v1','audio-test-s1','Pemberitahuan rekaman privat','Cakupan rekaman privat',true);

insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version) values
('70000000-0000-4000-8000-000000000112','synthetic-audio-material',1,'approved',
'{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"pos4-reading","phase":"screening","prompt":"Bacalah teks ini"}]}',
'audio-test-v1','audio-test-s1');

insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('70000000-0000-4000-8000-000000000113','70000000-0000-4000-8000-000000000091','70000000-0000-4000-8000-000000000102','guardian','verified',clock_timestamp());

-- Guardian grants activity consent only (recording not granted yet)
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000091',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000113','activity','grant','audio-test-v1','audio-test-s1');

-- Teacher 1 creates draft and starts session
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000090',true);
select public.set_teacher_pin('2468');

do $$
declare
  sess_id uuid;
  attempt_id uuid;
  upload_res jsonb;
  rec_id uuid;
  finalize_res jsonb;
  playback_res jsonb;
begin
  sess_id := public.create_assessment_draft('70000000-0000-4000-8000-000000000111','70000000-0000-4000-8000-000000000112');
  perform public.start_assessment_session(sess_id);
  perform public.enter_student_mode(sess_id);

  attempt_id := public.save_task_attempt('pos4-reading', 'passage_read', 'screening', '{"status":"ready_for_audio"}'::jsonb, gen_random_uuid(), 1);
  perform set_config('test.attempt_id', attempt_id::text, true);

  -- Upload request must be rejected without 'recording' consent
  begin
    perform public.request_audio_upload(attempt_id, 'audio/webm');
    raise exception 'Audio upload allowed without recording consent';
  exception when insufficient_privilege then null; end;
end $$;

-- Guardian grants 'recording' consent
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000091',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000113','recording','grant','audio-test-v1','audio-test-s1');

-- Teacher in student mode retries audio upload request
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000090',true);

do $$
declare
  attempt_id uuid;
  upload_res jsonb;
  rec_id uuid;
  playback_res jsonb;
begin
  attempt_id := current_setting('test.attempt_id', true)::uuid;

  -- Should now succeed
  upload_res := public.request_audio_upload(attempt_id, 'audio/webm');
  assert upload_res->>'storageObjectKey' ~ '^recordings/', 'Storage key not starting with recordings/';
  assert upload_res->>'mimeType' = 'audio/webm', 'Mime type mismatch';

  rec_id := (upload_res->>'recordingId')::uuid;

  -- Finalize audio upload with valid parameters
  perform public.finalize_audio_upload(rec_id, 'abc123def456sha256hash', 1048576, 12500);

  -- Unlock teacher mode before attempting teacher playback
  perform public.unlock_teacher_mode('2468');
  assert (select upload_status from public.recordings where id=rec_id) = 'ready', 'Recording not ready';

  -- Teacher can retrieve playback info
  playback_res := public.get_recording_playback_info(rec_id);
  assert playback_res->>'recordingId' = rec_id::text, 'Playback recording ID mismatch';
  assert (playback_res->>'byteSize')::int = 1048576, 'Byte size mismatch';
end $$;

-- Guardian revokes recording consent -> playback immediately blocked
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000091',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000113','recording','withdraw','audio-test-v1','audio-test-s1');

-- Teacher tries playback after revocation -> must be rejected
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000090',true);
do $$
declare
  rec_id uuid;
begin
  select id into rec_id from public.recordings limit 1;
  begin
    perform public.get_recording_playback_info(rec_id);
    raise exception 'Playback allowed after consent withdrawal';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
