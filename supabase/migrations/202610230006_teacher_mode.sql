begin;
create extension if not exists pgcrypto with schema extensions;

-- ponytail: synthetic staging only; PIN is not production MFA.
create table public.teacher_device_modes (
  teacher_id uuid primary key references public.profiles(id) on delete restrict,
  pin_hash text not null,
  session_id uuid references public.assessment_sessions(id) on delete restrict,
  locked_at timestamptz,
  expires_at timestamptz,
  failures integer not null default 0,
  blocked_until timestamptz
);
alter table public.teacher_device_modes enable row level security;
revoke all on public.teacher_device_modes from public,anon,authenticated;

create function public.teacher_mode_unlocked() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from public.teacher_device_modes where teacher_id=auth.uid() and locked_at is not null);
$$;
revoke all on function public.teacher_mode_unlocked() from public,anon;
grant execute on function public.teacher_mode_unlocked() to authenticated;

alter function public.can_access_assigned_child(uuid) rename to assigned_child_without_mode;
revoke all on function public.assigned_child_without_mode(uuid) from public,anon,authenticated;
create function public.can_access_assigned_child(target_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.teacher_mode_unlocked() and public.assigned_child_without_mode(target_child);
$$;
revoke all on function public.can_access_assigned_child(uuid) from public,anon;
grant execute on function public.can_access_assigned_child(uuid) to authenticated;
alter policy children_assigned_read on public.children using(public.can_access_assigned_child(id));

create policy profiles_mode_lock on public.profiles as restrictive to authenticated using(public.teacher_mode_unlocked()) with check(public.teacher_mode_unlocked());
create policy teacher_profiles_mode_lock on public.teacher_profiles as restrictive to authenticated using(public.teacher_mode_unlocked()) with check(public.teacher_mode_unlocked());
create policy children_mode_lock on public.children as restrictive to authenticated using(public.teacher_mode_unlocked());
create policy materials_mode_lock on public.material_versions as restrictive to authenticated using(public.teacher_mode_unlocked());
create policy sessions_mode_lock on public.assessment_sessions as restrictive to authenticated using(public.teacher_mode_unlocked());

create function public.prevent_locked_identity_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.teacher_mode_unlocked() then
    raise exception 'Teacher mode locked' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger profiles_locked before update on public.profiles for each row execute function public.prevent_locked_identity_write();
create trigger teacher_profiles_locked before insert or update on public.teacher_profiles for each row execute function public.prevent_locked_identity_write();

create function public.set_teacher_pin(p_pin text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'Invalid PIN' using errcode='22023'; end if;
  perform 1 from public.profiles where id=auth.uid() and product_role='teacher'
    and verification_status='verified' and account_status='active' for update;
  if not found or not public.teacher_mode_unlocked() then raise exception 'Teacher unavailable' using errcode='42501'; end if;
  insert into public.teacher_device_modes(teacher_id,pin_hash)
    values(auth.uid(),extensions.crypt(p_pin,extensions.gen_salt('bf',10)))
    on conflict(teacher_id) do nothing;
  if not found then raise exception 'PIN already configured; operator recovery required' using errcode='22023'; end if;
end;
$$;

create function public.enter_student_mode(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare selected public.assessment_sessions%rowtype;
begin
  perform 1 from public.teacher_device_modes where teacher_id=auth.uid() and locked_at is null for update;
  if not found then raise exception 'PIN required or already locked' using errcode='42501'; end if;
  select s.* into selected from public.assessment_sessions s
    join public.teacher_assignments a on a.id=s.teacher_assignment_id
    join public.school_members m on m.id=a.school_member_id
    join public.material_versions v on v.id=s.material_version_id
    where s.id=p_session_id and m.profile_id=auth.uid() and v.approval_status='approved'
      and a.status='active' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
      and public.can_access_assigned_child(s.child_id)
      and public.has_effective_consent(s.child_id,'activity',v.notice_version,v.processing_scope_version);
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  update public.teacher_device_modes set session_id=selected.id,locked_at=clock_timestamp(),
    expires_at=clock_timestamp()+interval '1 hour',failures=0,blocked_until=null where teacher_id=auth.uid();
end;
$$;

create function public.unlock_teacher_mode(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mode public.teacher_device_modes%rowtype;
begin
  select * into mode from public.teacher_device_modes where teacher_id=auth.uid() for update;
  if not found or mode.locked_at is null then return jsonb_build_object('ok',false); end if;
  if mode.blocked_until > clock_timestamp() then return jsonb_build_object('ok',false); end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' or extensions.crypt(p_pin,mode.pin_hash) <> mode.pin_hash then
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

-- Only preparation metadata; no stimulus/answers until the student protocol exists.
create function public.current_student_mode() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mode public.teacher_device_modes%rowtype;
begin
  select * into mode from public.teacher_device_modes where teacher_id=auth.uid();
  if not found or mode.locked_at is null then return jsonb_build_object('mode','teacher'); end if;
  if mode.expires_at <= clock_timestamp() then return jsonb_build_object('mode','locked','expired',true); end if;
  if not exists(select 1 from public.assessment_sessions s
    join public.teacher_assignments a on a.id=s.teacher_assignment_id
    join public.school_members m on m.id=a.school_member_id
    join public.material_versions v on v.id=s.material_version_id
    where s.id=mode.session_id and v.approval_status='approved'
      and m.profile_id=auth.uid() and a.status='active' and a.starts_at<=now()
      and (a.ends_at is null or a.ends_at>now())
      and public.assigned_child_without_mode(s.child_id)
      and exists(select 1 from public.consent_notices n where n.purpose='activity'
        and n.notice_version=v.notice_version and n.processing_scope_version=v.processing_scope_version and n.enabled)
      and exists(select 1 from public.guardian_links g where g.child_id=s.child_id and g.verification_status='verified' and g.revoked_at is null)
      and not exists(select 1 from public.guardian_links g join public.profiles p on p.id=g.guardian_id
        where g.child_id=s.child_id and g.verification_status='verified' and g.revoked_at is null
        and (p.product_role is distinct from 'guardian' or p.verification_status <> 'verified'
          or p.account_status <> 'active' or p.identity_confirmed_at is null
          or coalesce((select e.decision from public.consent_events e where e.guardian_link_id=g.id
            and e.purpose='activity' and e.notice_version=v.notice_version
            and e.processing_scope_version=v.processing_scope_version and e.recorded_at>=g.verified_at
            order by e.id desc limit 1),'deny')<>'grant')))
    then return jsonb_build_object('mode','locked','unavailable',true); end if;
  return jsonb_build_object('mode','student','sessionId',mode.session_id,'expiresAt',mode.expires_at);
end;
$$;
revoke all on function public.prevent_locked_identity_write() from public,anon,authenticated;
revoke all on function public.set_teacher_pin(text),public.enter_student_mode(uuid),
  public.unlock_teacher_mode(text),public.current_student_mode() from public,anon;
grant execute on function public.set_teacher_pin(text),public.enter_student_mode(uuid),
  public.unlock_teacher_mode(text),public.current_student_mode() to authenticated;
commit;
