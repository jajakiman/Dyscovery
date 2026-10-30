-- Synthetic. Run through rollback.
begin;
insert into auth.users(id) values
('71000000-0000-4000-8000-000000000010'),('71000000-0000-4000-8000-000000000011');
update public.profiles set product_role='teacher',verification_status='verified'
where id in ('71000000-0000-4000-8000-000000000010','71000000-0000-4000-8000-000000000011');
insert into public.schools(id,name,verification_status) values
('71000000-0000-4000-8000-000000000020','Sekolah Penugasan Sintetis','verified');
insert into public.school_members(id,school_id,profile_id,status,verified_at) values
('71000000-0000-4000-8000-000000000021','71000000-0000-4000-8000-000000000020','71000000-0000-4000-8000-000000000010','active',now());
insert into public.children(id,school_id,display_name,grade) values
('71000000-0000-4000-8000-000000000022','71000000-0000-4000-8000-000000000020','Anak Penugasan Sintetis','2');
insert into public.teacher_assignments(id,school_id,school_member_id,child_id,starts_at) values
('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000020','71000000-0000-4000-8000-000000000021','71000000-0000-4000-8000-000000000022',now()-interval '1 hour');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000010',true);
do $$ begin
  assert (select count(*) from public.my_assignments())=1, 'Own assignment missing';
end $$;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000011',true);
do $$ begin
  assert (select count(*) from public.my_assignments())=0, 'Other teacher sees assignment';
end $$;
reset role;
rollback;
