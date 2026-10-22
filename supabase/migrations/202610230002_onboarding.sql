begin;
create function public.confirm_teacher_identity(p_full_name text, p_display_name text, p_nip text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 150
    or p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 150
    or (p_nip is not null and p_nip !~ '^[0-9]{18}$') then
    raise exception 'Invalid identity';
  end if;
  perform 1 from public.profiles where id = actor and account_status = 'active'
    and (product_role is null or product_role = 'teacher') for update;
  if not found then raise exception 'Profile unavailable'; end if;
  update public.profiles set full_name = btrim(p_full_name), display_name = btrim(p_display_name) where id = actor;
  -- Separate update: name-change trigger clears confirmation before reconfirmation.
  update public.profiles set identity_confirmed_at = now() where id = actor;
  insert into public.teacher_profiles(profile_id, nip) values (actor, p_nip)
    on conflict (profile_id) do update set nip = excluded.nip;
end;
$$;
revoke all on function public.confirm_teacher_identity(text,text,text) from public, anon;
grant execute on function public.confirm_teacher_identity(text,text,text) to authenticated;
commit;
