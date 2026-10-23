-- Synthetic fixtures only; execute the entire transaction on staging.
begin;
insert into auth.users(id) values ('44444444-4444-4444-8444-444444444444'),('55555555-5555-4555-8555-555555555555');
update public.profiles set product_role='teacher',verification_status='verified'
where id in ('44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555');
insert into public.schools(id,name,verification_status) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Sekolah Sintetis A','verified'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Sekolah Sintetis B','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','active',now());
insert into public.children(id,school_id,display_name,grade) values
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Siswa Sintetis A','2'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Siswa Sintetis B','2');
insert into public.teacher_assignments(school_id,school_member_id,child_id,starts_at) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','dddddddd-dddd-4ddd-8ddd-dddddddddddd',now()-interval '1 hour');
do $$ begin
  begin
    insert into public.teacher_assignments(school_id,school_member_id,child_id,starts_at) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',now());
    raise exception 'Cross-school assignment accepted';
  exception when foreign_key_violation then null;
  end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ begin
  assert (select count(*) from public.children)=1, 'Assigned child missing or cross-school leak';
  begin
    update public.children set display_name='Unauthorized';
    raise exception 'Child write permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
do $$ begin assert (select count(*) from public.children)=0, 'Unassigned teacher leak'; end $$;
reset role;
update public.teacher_assignments set ends_at=now()-interval '1 minute';
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ begin assert (select count(*) from public.children)=0, 'Expired assignment leak'; end $$;
reset role;
update public.teacher_assignments set ends_at=null;
update public.profiles set account_status='suspended' where id='44444444-4444-4444-8444-444444444444';
set local role authenticated;
do $$ begin assert (select count(*) from public.children)=0, 'Suspended account leak'; end $$;
reset role;
rollback;
