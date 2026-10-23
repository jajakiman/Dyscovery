-- Synthetic preparation only, not an assessment instrument. Run through rollback.
begin;
insert into auth.users(id) values
('70000000-0000-4000-8000-000000000010'),
('70000000-0000-4000-8000-000000000011'),
('70000000-0000-4000-8000-000000000012');
update public.profiles set product_role='teacher',verification_status='verified'
where id in ('70000000-0000-4000-8000-000000000010','70000000-0000-4000-8000-000000000012');
update public.profiles set product_role='guardian',verification_status='verified',full_name='Wali Sintetis'
where id='70000000-0000-4000-8000-000000000011';
update public.profiles set identity_confirmed_at=now() where id='70000000-0000-4000-8000-000000000011';
insert into public.schools(id,name,verification_status) values
('70000000-0000-4000-8000-000000000020','Sekolah Sesi Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('70000000-0000-4000-8000-000000000021','70000000-0000-4000-8000-000000000020','70000000-0000-4000-8000-000000000010','active',now());
insert into public.children(id,school_id,display_name,grade) values
('70000000-0000-4000-8000-000000000022','70000000-0000-4000-8000-000000000020','Anak Sesi Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000020','70000000-0000-4000-8000-000000000021','70000000-0000-4000-8000-000000000022',now()-interval '1 hour');
insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled)
values ('activity','draft-test-v1','draft-test-s1','Pemberitahuan sintetis','Persiapan draf sintetis',true);
insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version)
values ('70000000-0000-4000-8000-000000000002','synthetic-not-an-instrument',1,'draft',
'{"synthetic":true,"items":[]}', 'draft-test-v1','draft-test-s1');
insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('70000000-0000-4000-8000-000000000023','70000000-0000-4000-8000-000000000011','70000000-0000-4000-8000-000000000022','guardian','verified',clock_timestamp());
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000010',true);
do $$ begin
  begin
    perform public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
    raise exception 'Draft material accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.material_versions set approval_status='approved' where id='70000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
  begin
    perform public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
    raise exception 'Missing consent accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000011',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000023','activity','grant','draft-test-v1','draft-test-s1');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000010',true);
do $$ declare first_id uuid; begin
  first_id := public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
  assert first_id = public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002'), 'Retry duplicated draft';
  assert (select count(*) from public.assessment_sessions where id=first_id and status='draft')=1, 'Authorized draft missing';
  begin
    update public.assessment_sessions set status='draft' where id=first_id;
    raise exception 'Direct session write allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000012',true);
do $$ begin
  assert (select count(*) from public.assessment_sessions)=0, 'Unassigned teacher leak';
  begin
    perform public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
    raise exception 'Other teacher created draft';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000011',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000023','activity','withdraw','draft-test-v1','draft-test-s1');
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000010',true);
do $$ begin
  assert (select count(*) from public.assessment_sessions)=0, 'Withdrawn session visible';
  begin
    perform public.create_assessment_draft('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
    raise exception 'Withdrawal bypassed on retry';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
