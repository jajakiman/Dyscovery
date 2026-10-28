-- Synthetic session lifecycle, task attempts, and append-only session events rollback test.
begin;
insert into auth.users(id) values
('70000000-0000-4000-8000-000000000050'),
('70000000-0000-4000-8000-000000000051'),
('70000000-0000-4000-8000-000000000052');
update public.profiles set product_role='teacher',verification_status='verified',account_status='active'
where id in ('70000000-0000-4000-8000-000000000050','70000000-0000-4000-8000-000000000052');
update public.profiles set product_role='guardian',verification_status='verified',account_status='active',full_name='Wali Sesi Sintetis'
where id='70000000-0000-4000-8000-000000000051';
update public.profiles set identity_confirmed_at=now() where id='70000000-0000-4000-8000-000000000051';

insert into public.schools(id,name,verification_status) values
('70000000-0000-4000-8000-000000000060','Sekolah Lifecycle Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('70000000-0000-4000-8000-000000000061','70000000-0000-4000-8000-000000000060','70000000-0000-4000-8000-000000000050','active',now()),
('70000000-0000-4000-8000-000000000063','70000000-0000-4000-8000-000000000060','70000000-0000-4000-8000-000000000052','active',now());
insert into public.children(id,school_id,display_name,grade) values
('70000000-0000-4000-8000-000000000062','70000000-0000-4000-8000-000000000060','Anak Lifecycle Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('70000000-0000-4000-8000-000000000071','70000000-0000-4000-8000-000000000060','70000000-0000-4000-8000-000000000061','70000000-0000-4000-8000-000000000062',now()-interval '1 hour');

insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled)
values ('activity','lifecycle-test-v1','lifecycle-test-s1','Pemberitahuan sintetis lifecycle','Persiapan lifecycle sintetis',true);
insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version)
values ('70000000-0000-4000-8000-000000000072','synthetic-lifecycle-material',1,'approved',
'{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"encounter-1","phase":"practice","prompt":"Uji pos 1"}]}',
'lifecycle-test-v1','lifecycle-test-s1');

insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('70000000-0000-4000-8000-000000000073','70000000-0000-4000-8000-000000000051','70000000-0000-4000-8000-000000000062','guardian','verified',clock_timestamp());

-- Grant guardian consent
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000051',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000073','activity','grant','lifecycle-test-v1','lifecycle-test-s1');

-- Teacher 1 creates draft session and configures PIN
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000050',true);
select public.set_teacher_pin('654321');

do $$
declare
  sess_id uuid;
  req_id uuid := '70000000-0000-4000-8000-000000000080'::uuid;
  attempt_id uuid;
  retry_id uuid;
  event_id uuid;
begin
  sess_id := public.create_assessment_draft('70000000-0000-4000-8000-000000000071','70000000-0000-4000-8000-000000000072');
  assert (select status from public.assessment_sessions where id=sess_id) = 'draft', 'Initial session not draft';

  -- Start session
  perform public.start_assessment_session(sess_id);
  assert (select status from public.assessment_sessions where id=sess_id) = 'in_progress', 'Session not in_progress';
  assert (select count(*) from public.session_events where session_id=sess_id and event_type='session_started') = 1, 'session_started event missing';

  -- Cannot start again
  begin
    perform public.start_assessment_session(sess_id);
    raise exception 'Double start allowed';
  exception when invalid_parameter_value then null; end;

  -- Record mid-session event (e.g. pause_requested, resumed, teacher_called)
  event_id := public.record_session_event(sess_id, 'pause_requested', 'Anak ingin minum');
  assert event_id is not null, 'Failed recording session event';
  assert (select count(*) from public.session_events where id=event_id) = 1, 'Event record missing';

  -- session_events immutable trigger test: update or delete must be rejected
  begin
    update public.session_events set note='Edited note' where id=event_id;
    raise exception 'session_events update allowed';
  exception when others then null; end;

  begin
    delete from public.session_events where id=event_id;
    raise exception 'session_events delete allowed';
  exception when others then null; end;

  -- Enter student mode
  perform public.enter_student_mode(sess_id);

  -- Save task attempt in student mode
  attempt_id := public.save_task_attempt('pos1-letter-arrange', 'letter_arrange', 'screening', '{"arranged":["B","A","T","U"]}'::jsonb, req_id, 1);
  assert attempt_id is not null, 'Failed saving task attempt';

  -- Idempotency test: exact retry returns same id
  retry_id := public.save_task_attempt('pos1-letter-arrange', 'letter_arrange', 'screening', '{"arranged":["B","A","T","U"]}'::jsonb, req_id, 1);
  assert attempt_id = retry_id, 'Idempotent retry did not return same id';

  -- Conflict test: same request_id but different response rejected
  begin
    perform public.save_task_attempt('pos1-letter-arrange', 'letter_arrange', 'screening', '{"arranged":["K","A","Y","U"]}'::jsonb, req_id, 1);
    raise exception 'Conflict response accepted';
  exception when invalid_parameter_value then null; end;

  -- Complete session
  perform public.complete_assessment_session(sess_id);
  assert (select status from public.assessment_sessions where id=sess_id) = 'completed', 'Session not completed';
  assert (select count(*) from public.session_events where session_id=sess_id and event_type='session_completed') = 1, 'session_completed event missing';

  -- Cannot save new attempts after completed
  begin
    perform public.save_task_attempt('pos2-spelling', 'spelling_image', 'screening', '{"spelled":"HUTAN"}'::jsonb, gen_random_uuid(), 1);
    raise exception 'Attempt allowed after completion';
  exception when insufficient_privilege then null; end;
end $$;

-- Teacher 2 without assignment cannot access or start Teacher 1 session
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000052',true);
select public.set_teacher_pin('112233');

do $$
declare
  t1_sess uuid;
begin
  select id into t1_sess from public.assessment_sessions where child_id='70000000-0000-4000-8000-000000000062';
  begin
    perform public.start_assessment_session(t1_sess);
    raise exception 'Cross-teacher session start allowed';
  exception when insufficient_privilege then null; end;

  begin
    perform public.record_session_event(t1_sess, 'teacher_called', 'interfering');
    raise exception 'Cross-teacher event recording allowed';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
