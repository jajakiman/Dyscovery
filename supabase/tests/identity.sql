-- Run only on staging/test after the migration. All fixtures roll back.
begin;
insert into auth.users (id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'Cross-account read leaked';
  update public.profiles set full_name = 'Guru Sintetis'
    where id = '11111111-1111-4111-8111-111111111111';
  assert (select full_name from public.profiles) = 'Guru Sintetis';
  begin
    update public.profiles set verification_status = 'verified';
    raise exception 'Privilege escalation succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.teacher_profiles (profile_id, nip)
    values ('11111111-1111-4111-8111-111111111111', '123456789012345678');
    raise exception 'Teacher self-provisioning succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
