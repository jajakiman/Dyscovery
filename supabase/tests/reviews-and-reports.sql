-- Synthetic manual reviews and observation reports rollback test.
begin;
insert into auth.users(id) values
('70000000-0000-4000-8000-000000000120'),
('70000000-0000-4000-8000-000000000121'),
('70000000-0000-4000-8000-000000000122');

update public.profiles set product_role='teacher',verification_status='verified',account_status='active'
where id in ('70000000-0000-4000-8000-000000000120','70000000-0000-4000-8000-000000000122');
update public.profiles set product_role='guardian',verification_status='verified',account_status='active',full_name='Wali Laporan Sintetis'
where id='70000000-0000-4000-8000-000000000121';
update public.profiles set identity_confirmed_at=now() where id='70000000-0000-4000-8000-000000000121';

insert into public.schools(id,name,verification_status) values
('70000000-0000-4000-8000-000000000130','Sekolah Laporan Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('70000000-0000-4000-8000-000000000131','70000000-0000-4000-8000-000000000130','70000000-0000-4000-8000-000000000120','active',now()),
('70000000-0000-4000-8000-000000000133','70000000-0000-4000-8000-000000000130','70000000-0000-4000-8000-000000000122','active',now());
insert into public.children(id,school_id,display_name,grade) values
('70000000-0000-4000-8000-000000000132','70000000-0000-4000-8000-000000000130','Anak Laporan Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('70000000-0000-4000-8000-000000000141','70000000-0000-4000-8000-000000000130','70000000-0000-4000-8000-000000000131','70000000-0000-4000-8000-000000000132',now()-interval '1 hour');

insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled) values
('activity','report-test-v1','report-test-s1','Pemberitahuan laporan sintetis','Cakupan laporan',true);

insert into public.material_versions(id,material_key,version,approval_status,definition,notice_version,processing_scope_version) values
('70000000-0000-4000-8000-000000000142','synthetic-report-material',1,'approved',
'{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"pos4-reading","phase":"screening","prompt":"Teks cerita"}]}',
'report-test-v1','report-test-s1');

insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('70000000-0000-4000-8000-000000000143','70000000-0000-4000-8000-000000000121','70000000-0000-4000-8000-000000000132','guardian','verified',clock_timestamp());

set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000121',true);
select public.record_guardian_consent('70000000-0000-4000-8000-000000000143','activity','grant','report-test-v1','report-test-s1');

select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000120',true);
select public.set_teacher_pin('135790');

do $$
declare
  sess_id uuid;
  attempt_id uuid;
  rev_id uuid;
  pub_res jsonb;
  rep_id uuid;
begin
  sess_id := public.create_assessment_draft('70000000-0000-4000-8000-000000000141','70000000-0000-4000-8000-000000000142');
  perform public.start_assessment_session(sess_id);
  perform public.enter_student_mode(sess_id);
  attempt_id := public.save_task_attempt('pos4-reading', 'passage_read', 'screening', '{"read":true}'::jsonb, gen_random_uuid(), 1);
  perform public.complete_assessment_session(sess_id);
  perform public.unlock_teacher_mode('135790');

  -- Teacher creates draft review
  rev_id := public.save_review_draft(
    attempt_id,
    '{"accuracyScore": 85, "fluencyNotes": "Cukup lancar"}'::jsonb,
    '[{"finding": "substitution", "note": "Kata pohon terbaca pohong", "evidenceLocation": {"word": "pohon"}}]'::jsonb
  );
  assert rev_id is not null, 'Draft review creation failed';
  assert (select count(*) from public.review_annotations where review_revision_id = rev_id) = 1, 'Annotation missing';

  -- Finalize review revision
  perform public.finalize_review_revision(rev_id);
  assert (select status from public.review_revisions where id = rev_id) = 'finalized', 'Revision not finalized';

  -- Finalized review immutability: updates must fail
  begin
    update public.review_revisions set rubric_result = '{"tampered":true}'::jsonb where id = rev_id;
    raise exception 'Finalized review update allowed';
  exception when others then null; end;

  -- Annotations of finalized review immutability: insert must fail
  begin
    insert into public.review_annotations(review_revision_id, finding, note)
      values (rev_id, 'repetition', 'Late annotation');
    raise exception 'Late annotation insertion allowed';
  exception when others then null; end;

  -- Publish observation report
  pub_res := public.publish_observation_report(
    sess_id,
    '{"summary": "Observasi membaca selesai", "encountersCompleted": 5}'::jsonb,
    'Perlu penguatan bunyi sengau',
    'teacher_manual',
    array[rev_id]
  );
  assert pub_res->>'status' = 'published', 'Report not published';
  assert (pub_res->>'version')::int = 1, 'First report version not 1';

  rep_id := (pub_res->>'reportVersionId')::uuid;

  -- Published report immutability: updates must fail
  begin
    update public.report_versions set follow_up_text = 'Tampered text' where id = rep_id;
    raise exception 'Published report update allowed';
  exception when others then null; end;
end $$;

-- Guardian access to published report and finalized review
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000121',true);
assert (select count(*) from public.report_versions where status = 'published') = 1, 'Guardian cannot read published report';
assert (select count(*) from public.review_revisions where status = 'finalized') = 1, 'Guardian cannot read finalized review';

-- Teacher 2 without assignment cannot read report
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000122',true);
select public.set_teacher_pin('246802');
assert (select count(*) from public.report_versions) = 0, 'Unassigned teacher read report';

reset role;
rollback;
