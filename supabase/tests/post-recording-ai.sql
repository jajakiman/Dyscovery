-- Synthetic post-recording AI analysis and candidate annotations rollback test.
begin;
insert into auth.users(id) values
('70000000-0000-4000-8000-000000000150'),
('70000000-0000-4000-8000-000000000151'),
('70000000-0000-4000-8000-000000000152');

update public.profiles set product_role='teacher',verification_status='verified',account_status='active'
where id in ('70000000-0000-4000-8000-000000000150','70000000-0000-4000-8000-000000000152');
update public.profiles set product_role='guardian',verification_status='verified',account_status='active',full_name='Wali AI Sintetis'
where id='70000000-0000-4000-8000-000000000151';
update public.profiles set identity_confirmed_at=now() where id='70000000-0000-4000-8000-000000000151';

insert into public.schools(id,name,verification_status) values
('70000000-0000-4000-8000-000000000160','Sekolah AI Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('70000000-0000-4000-8000-000000000161','70000000-0000-4000-8000-000000000160','70000000-0000-4000-8000-000000000150','active',now()),
('70000000-0000-4000-8000-000000000163','70000000-0000-4000-8000-000000000160','70000000-0000-4000-8000-000000000152','active',now());
insert into public.children(id,school_id,display_name,grade) values
('70000000-0000-4000-8000-000000000162','70000000-0000-4000-8000-000000000160','Anak AI Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('70000000-0000-4000-8000-000000000171','70000000-0000-4000-8000-000000000160','70000000-0000-4000-8000-000000000161','70000000-0000-4000-8000-000000000162',now()-interval '1 hour');

insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled) values
('activity','ai-test-v1','ai-test-s1','Pemberitahuan aktivitas','Cakupan aktivitas',true),
('recording','ai-test-v1','ai-test-s1','Pemberitahuan rekaman','Cakupan rekaman',true),
('ai','ai-test-v1','ai-test-s1','Pemberitahuan AI pascarekaman','Cakupan inferensi AI',true);

insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version) values
('70000000-0000-4000-8000-000000000172','synthetic-ai-material',1,'approved',
'{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"pos4-reading","phase":"screening","prompt":"Kancil melompat"}]}',
'ai-test-v1','ai-test-s1');

insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('70000000-0000-4000-8000-000000000173','70000000-0000-4000-8000-000000000151','70000000-0000-4000-8000-000000000162','guardian','verified',clock_timestamp());

-- Guardian grants activity and recording only
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000151',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000173','activity','grant','ai-test-v1','ai-test-s1');
select public.record_guardian_consent('70000000-0000-4000-8000-000000000173','recording','grant','ai-test-v1','ai-test-s1');

-- Teacher starts session, records audio and finalizes it
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000150',true);
select public.set_teacher_pin('3141');

do $$
declare
  sess_id uuid;
  attempt_id uuid;
  up_res jsonb;
  rec_id uuid;
  ai_res jsonb;
begin
  sess_id := public.create_assessment_draft('70000000-0000-4000-8000-000000000171','70000000-0000-4000-8000-000000000172');
  perform public.start_assessment_session(sess_id);
  perform public.enter_student_mode(sess_id);
  attempt_id := public.save_task_attempt('pos4-reading', 'passage_read', 'screening', '{"ready":true}'::jsonb, gen_random_uuid(), 1);
  up_res := public.request_audio_upload(attempt_id, 'audio/webm');
  rec_id := (up_res->>'recordingId')::uuid;
  perform public.finalize_audio_upload(rec_id, 'hash-val-1234567890', 524288, 8500);
  perform public.unlock_teacher_mode('3141');

  -- Attempting AI analysis without AI consent must be rejected
  begin
    perform public.request_ai_analysis(rec_id, 'idempotent-key-test-01');
    raise exception 'AI analysis allowed without AI consent';
  exception when insufficient_privilege then null; end;
end $$;

-- Guardian now grants 'ai' consent
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000151',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000173','ai','grant','ai-test-v1','ai-test-s1');

-- Teacher requests AI analysis
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000150',true);

do $$
declare
  rec_id uuid;
  ai_res jsonb;
  ai_id uuid;
  retry_res jsonb;
begin
  select id into rec_id from public.recordings limit 1;

  ai_res := public.request_ai_analysis(rec_id, 'idempotent-key-test-01');
  assert ai_res->>'status' = 'queued', 'AI request status not queued';
  ai_id := (ai_res->>'analysisId')::uuid;

  -- Idempotency: exact key returns existing analysis ID
  retry_res := public.request_ai_analysis(rec_id, 'idempotent-key-test-01');
  assert (retry_res->>'analysisId')::uuid = ai_id, 'Idempotency failed to return same analysis ID';

  -- Record analysis results with candidate annotations
  perform public.record_ai_analysis_results(
    ai_id,
    'completed',
    4200,
    '[{"referenceStart": 0, "referenceEnd": 6, "audioStartMs": 200, "audioEndMs": 1200, "annotationType": "match", "observedText": "Kancil", "confidenceScore": 0.95}, {"referenceStart": 7, "referenceEnd": 15, "audioStartMs": 1300, "audioEndMs": 2500, "annotationType": "substitution", "observedText": "meluncat", "confidenceScore": 0.88}]'::jsonb
  );

  assert (select count(*) from public.ai_annotations where ai_analysis_id = ai_id) = 2, 'Candidate annotations missing';
end $$;

-- Guardian can read AI analysis results while consent is active
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000151',true);
do $$ begin assert (select count(*) from public.ai_analyses) = 1, 'Guardian cannot read AI analyses';
assert (select count(*) from public.ai_annotations) = 2, 'Guardian cannot read AI annotations'; end $$;

-- Guardian revokes AI consent -> RLS immediately blocks reading
select public.record_guardian_consent('70000000-0000-4000-8000-000000000173','ai','withdraw','ai-test-v1','ai-test-s1');
do $$ begin assert (select count(*) from public.ai_analyses) = 0, 'AI analysis read allowed after consent revocation'; end $$;

-- Unassigned teacher cannot read
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000152',true);
select public.set_teacher_pin('2718');
do $$ begin assert (select count(*) from public.ai_analyses) = 0, 'Unassigned teacher read AI analysis'; end $$;

reset role;
rollback;
