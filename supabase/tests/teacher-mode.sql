-- Synthetic backend isolation test, not a complete student handoff test.
begin;
do $$ begin
  assert not exists (
    select 1 from pg_catalog.pg_depend d
    join pg_catalog.pg_policy p on p.oid=d.objid
    where d.classid='pg_catalog.pg_policy'::regclass
      and d.refclassid='pg_catalog.pg_proc'::regclass
      and d.refobjid='public.assigned_child_without_mode(uuid)'::regprocedure
  ), 'RLS policy still calls private pre-mode helper';
  assert not has_function_privilege('authenticated','public.assigned_child_without_mode(uuid)','EXECUTE'),
    'Private helper exposed to authenticated';
end $$;
insert into auth.users(id) values ('80000000-0000-4000-8000-000000000001');
update public.profiles set product_role='teacher',verification_status='verified'
where id='80000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
select public.set_teacher_pin('012345');
do $$ begin
  assert public.teacher_mode_unlocked(), 'Initially locked';
  begin
    perform public.set_teacher_pin('111111');
    raise exception 'PIN replaced without recovery';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.teacher_device_modes set locked_at=clock_timestamp(),expires_at=clock_timestamp()+interval '1 hour'
where teacher_id='80000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  assert not public.teacher_mode_unlocked(), 'Old token bypassed mode lock';
  assert (select count(*) from public.profiles)=0, 'Profile visible while locked';
  assert (select count(*) from public.children)=0, 'Children visible while locked';
  assert (select count(*) from public.material_versions)=0, 'Materials visible while locked';
  assert (select count(*) from public.assessment_sessions)=0, 'Sessions visible while locked';
  begin
    perform public.confirm_teacher_identity('Changed','Changed',null);
    raise exception 'Onboarding bypassed lock';
  exception when insufficient_privilege then null; end;
  for i in 1..5 loop
    assert not (public.unlock_teacher_mode('999999')->>'ok')::boolean, 'Wrong PIN accepted';
  end loop;
  assert not (public.unlock_teacher_mode('012345')->>'ok')::boolean, 'Correct PIN bypassed lockout';
end $$;
reset role;
update public.teacher_device_modes set blocked_until=clock_timestamp()-interval '1 second'
where teacher_id='80000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
  assert (public.unlock_teacher_mode('012345')->>'ok')::boolean, 'Correct PIN rejected after lockout';
  assert public.teacher_mode_unlocked(), 'Teacher access not restored';
  assert (select count(*) from public.profiles)=1, 'Profile not restored';
end $$;
reset role;
rollback;
