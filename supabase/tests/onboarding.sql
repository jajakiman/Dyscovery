begin;
insert into auth.users(id) values ('33333333-3333-4333-8333-333333333333');
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select public.confirm_teacher_identity('Guru Sintetis', 'Guru', null);
do $$
begin
  assert (select identity_confirmed_at is not null and product_role is null
    and verification_status = 'pending' from public.profiles where id = auth.uid()), 'Onboarding elevated role or failed';
  begin
    perform public.confirm_teacher_identity('Guru', 'Guru', 'invalid');
    raise exception 'Invalid NIP accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid identity' then raise; end if;
  end;
  update public.profiles set full_name = 'Nama Baru' where id = auth.uid();
  assert (select identity_confirmed_at is null from public.profiles where id = auth.uid()), 'Name change retained confirmation';
end;
$$;
reset role;
rollback;
