begin;

-- ponytail: synthetic staging only; a 4-digit PIN is weak and is not production MFA.
-- New PINs must be 4 digits. Unlock still accepts legacy 6-digit PINs so accounts configured before this migration are not stranded.
create or replace function public.set_teacher_pin(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then raise exception 'Invalid PIN' using errcode='22023'; end if;
  perform 1 from public.profiles where id=auth.uid() and product_role='teacher'
    and verification_status='verified' and account_status='active' for update;
  if not found or not public.teacher_mode_unlocked() then raise exception 'Teacher unavailable' using errcode='42501'; end if;
  insert into public.teacher_device_modes(teacher_id,pin_hash)
    values(auth.uid(),extensions.crypt(p_pin,extensions.gen_salt('bf',10)))
    on conflict(teacher_id) do nothing;
  if not found then raise exception 'PIN already configured; operator recovery required' using errcode='22023'; end if;
end;
$$;

create or replace function public.unlock_teacher_mode(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mode public.teacher_device_modes%rowtype;
begin
  select * into mode from public.teacher_device_modes where teacher_id=auth.uid() for update;
  if not found or mode.locked_at is null then return jsonb_build_object('ok',false); end if;
  if mode.blocked_until > clock_timestamp() then return jsonb_build_object('ok',false); end if;
  if p_pin is null or p_pin !~ '^([0-9]{4}|[0-9]{6})$' or extensions.crypt(p_pin,mode.pin_hash) <> mode.pin_hash then
    update public.teacher_device_modes set failures=case when failures>=4 then 0 else failures+1 end,
      blocked_until=case when failures>=4 then clock_timestamp()+interval '15 minutes' else null end
      where teacher_id=auth.uid();
    return jsonb_build_object('ok',false);
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and product_role='teacher'
    and account_status='active' and verification_status='verified') then return jsonb_build_object('ok',false); end if;
  update public.teacher_device_modes set session_id=null,locked_at=null,expires_at=null,
    failures=0,blocked_until=null where teacher_id=auth.uid();
  return jsonb_build_object('ok',true,'sessionId',mode.session_id);
end;
$$;

commit;
