-- Run the entire script on the testing database; no fixtures persist.
begin;
insert into auth.users(id) values
('60000000-0000-4000-8000-000000000001'),
('60000000-0000-4000-8000-000000000002'),
('60000000-0000-4000-8000-000000000003');
update public.profiles set product_role='guardian', verification_status='verified',
full_name='Wali Sintetis' where id::text like '60000000-%';
update public.profiles set identity_confirmed_at=now() where id::text like '60000000-%';
insert into public.schools(id,name,verification_status) values
('60000000-0000-4000-8000-000000000010','Sekolah Consent Sintetis','verified');
insert into public.children(id,school_id,display_name,grade) values
('60000000-0000-4000-8000-000000000011','60000000-0000-4000-8000-000000000010','Anak Sintetis','2');
insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled)
values ('activity','test-v1','test-s1','PEMBERITAHUAN SINTETIS, BUKAN UNTUK DATA NYATA','Kegiatan uji sintetis saja',true);
insert into public.guardian_links(id,guardian_id,child_id,relationship,verification_status,verified_at) values
('60000000-0000-4000-8000-000000000021','60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000011','parent','verified',clock_timestamp()),
('60000000-0000-4000-8000-000000000022','60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000011','guardian','verified',clock_timestamp());
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select public.record_guardian_consent('60000000-0000-4000-8000-000000000021','activity','grant','test-v1','test-s1');
do $$ begin
  assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'One of two guardians granted';
  assert (select count(*) from public.guardian_links)=1, 'Other guardian disclosed';
  begin
    perform public.record_guardian_consent('60000000-0000-4000-8000-000000000022','activity','grant','test-v1','test-s1');
    raise exception 'Other guardian impersonated';
  exception when insufficient_privilege then null; end;
  begin
    update public.consent_events set decision='grant';
    raise exception 'History mutable';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
select public.record_guardian_consent('60000000-0000-4000-8000-000000000022','activity','grant','test-v1','test-s1');
do $$ begin
  assert public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Both grants missing';
  assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','recording','test-v1','test-s1'), 'Purpose leaked';
end $$;
select public.record_guardian_consent('60000000-0000-4000-8000-000000000022','activity','withdraw','test-v1','test-s1');
do $$ begin assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Withdrawal ignored'; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
do $$ begin
  assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Unlinked account allowed';
  assert (select count(*) from public.consent_events)=0, 'Other guardian history disclosed';
  begin
    perform public.record_guardian_consent('60000000-0000-4000-8000-000000000021','activity','grant','test-v1','test-s1');
    raise exception 'Unlinked account wrote consent';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.guardian_links set revoked_at=clock_timestamp() where id='60000000-0000-4000-8000-000000000022';
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
do $$ begin assert public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Single legitimate guardian blocked'; end $$;
reset role;
update public.guardian_links set revoked_at=null where id='60000000-0000-4000-8000-000000000022';
set local role authenticated;
do $$ begin assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Reverification reused old decision'; end $$;
reset role;
update public.guardian_links set revoked_at=clock_timestamp() where id='60000000-0000-4000-8000-000000000022';
update public.profiles set account_status='suspended' where id='60000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin assert not public.has_effective_consent('60000000-0000-4000-8000-000000000011','activity','test-v1','test-s1'), 'Suspended guardian allowed'; end $$;
reset role;
rollback;
