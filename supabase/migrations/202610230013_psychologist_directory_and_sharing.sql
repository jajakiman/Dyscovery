begin;
-- Migration 013: Verified Psychologist Directory, Time-Bound Report Sharing, Consultation Requests, and Audit Events

-- 1. AUDIT_EVENTS table (append-only ledger)
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 80),
  object_type text not null check (char_length(btrim(object_type)) between 1 and 80),
  object_id uuid not null,
  outcome text not null check (outcome in ('success', 'denied', 'revoked', 'failed')),
  occurred_at timestamptz not null default clock_timestamp()
);
create index audit_events_actor on public.audit_events(actor_id);
create index audit_events_object on public.audit_events(object_type, object_id);

create function public.protect_audit_events() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Audit events are strictly append-only and cannot be updated or deleted';
end;
$$;

create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.protect_audit_events();

-- 2. PSYCHOLOGIST_PROFILES table
create table public.psychologist_profiles (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  avatar_url text check (avatar_url is null or char_length(btrim(avatar_url)) between 1 and 2048),
  credential_id text not null check (char_length(btrim(credential_id)) between 1 and 100),
  credential_type text not null check (credential_type in ('STR_PSIKOLOG_KLINIS', 'NIP_INSTITUSI')),
  institution_name text not null check (char_length(btrim(institution_name)) between 1 and 200),
  clinic_address text check (clinic_address is null or char_length(btrim(clinic_address)) between 1 and 500),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (verification_status <> 'verified' or verified_at is not null)
);

create function public.touch_psychologist_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger psychologist_profiles_updated before update on public.psychologist_profiles
for each row execute function public.touch_psychologist_updated_at();

-- 3. REPORT_SHARES table (Mandatory time-bound sharing, raw audio excluded by default)
create table public.report_shares (
  id uuid primary key default gen_random_uuid(),
  report_version_id uuid not null references public.report_versions(id) on delete restrict,
  guardian_link_id uuid not null references public.guardian_links(id) on delete restrict,
  psychologist_id uuid not null references public.psychologist_profiles(profile_id) on delete restrict,
  notice_version text not null check (char_length(btrim(notice_version)) between 1 and 80),
  scope jsonb not null default '{"include_audio": false}'::jsonb check (jsonb_typeof(scope) = 'object'),
  granted_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (expires_at > granted_at)
);
create index report_shares_report on public.report_shares(report_version_id);
create index report_shares_guardian on public.report_shares(guardian_link_id);
create index report_shares_psychologist on public.report_shares(psychologist_id);

create function public.protect_report_share() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Report shares cannot be deleted; set revoked_at to revoke access';
  end if;
  if tg_op = 'UPDATE' then
    if old.revoked_at is not null then
      raise exception 'Revoked report shares cannot be modified';
    end if;
    if (new.report_version_id <> old.report_version_id or
        new.guardian_link_id <> old.guardian_link_id or
        new.psychologist_id <> old.psychologist_id or
        new.notice_version <> old.notice_version or
        new.scope <> old.scope or
        new.granted_at <> old.granted_at or
        new.expires_at <> old.expires_at) then
      raise exception 'Report share parameters are immutable; only revocation is allowed';
    end if;
  end if;
  return new;
end;
$$;

create trigger report_share_guard before update or delete on public.report_shares
for each row execute function public.protect_report_share();

-- 4. CONSULTATION_REQUESTS table (Medical confidentiality: excluded from teachers)
create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  guardian_link_id uuid not null references public.guardian_links(id) on delete restrict,
  psychologist_id uuid not null references public.psychologist_profiles(profile_id) on delete restrict,
  report_share_id uuid references public.report_shares(id) on delete set null,
  requested_time timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index consultation_requests_guardian on public.consultation_requests(guardian_link_id);
create index consultation_requests_psychologist on public.consultation_requests(psychologist_id);

create function public.touch_consultation_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger consultation_requests_updated before update on public.consultation_requests
for each row execute function public.touch_consultation_updated_at();

-- 5. RPCs
-- RPC: grant_report_share
create function public.grant_report_share(
  p_report_version_id uuid,
  p_psychologist_id uuid,
  p_notice_version text,
  p_expires_at timestamptz,
  p_include_audio boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  rep public.report_versions%rowtype;
  sess public.assessment_sessions%rowtype;
  g_link public.guardian_links%rowtype;
  psy public.psychologist_profiles%rowtype;
  share_id uuid;
begin
  select * into rep from public.report_versions where id = p_report_version_id;
  if not found or rep.status <> 'published' then
    raise exception 'Published report version unavailable' using errcode = '42501';
  end if;

  select * into sess from public.assessment_sessions where id = rep.session_id;
  if not found then raise exception 'Session not found' using errcode = '42501'; end if;

  -- Ensure caller is a verified guardian of this child
  select * into g_link from public.guardian_links
    where child_id = sess.child_id
      and guardian_id = auth.uid()
      and verification_status = 'verified'
      and revoked_at is null;
  if not found then
    raise exception 'Caller is not a verified guardian of child' using errcode = '42501';
  end if;

  -- Ensure psychologist exists and is verified
  select * into psy from public.psychologist_profiles
    where profile_id = p_psychologist_id
      and verification_status = 'verified';
  if not found then
    raise exception 'Psychologist not found or unverified' using errcode = '42501';
  end if;

  -- Mandatory future expiration
  if p_expires_at is null or p_expires_at <= clock_timestamp() then
    raise exception 'expires_at must be in the future' using errcode = '22023';
  end if;

  insert into public.report_shares (
    report_version_id,
    guardian_link_id,
    psychologist_id,
    notice_version,
    scope,
    expires_at
  ) values (
    rep.id,
    g_link.id,
    psy.profile_id,
    p_notice_version,
    jsonb_build_object('include_audio', coalesce(p_include_audio, false)),
    p_expires_at
  ) returning id into share_id;

  insert into public.audit_events (actor_id, action, object_type, object_id, outcome)
  values (auth.uid(), 'grant_report_share', 'report_shares', share_id, 'success');

  return share_id;
end;
$$;

-- RPC: revoke_report_share
create function public.revoke_report_share(p_share_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  share_row public.report_shares%rowtype;
  g_link public.guardian_links%rowtype;
begin
  select * into share_row from public.report_shares where id = p_share_id;
  if not found then raise exception 'Share not found' using errcode = '42501'; end if;

  select * into g_link from public.guardian_links
    where id = share_row.guardian_link_id
      and guardian_id = auth.uid()
      and verification_status = 'verified';
  if not found then
    raise exception 'Caller is not authorized to revoke this share' using errcode = '42501';
  end if;

  if share_row.revoked_at is not null then
    return true;
  end if;

  update public.report_shares set revoked_at = clock_timestamp() where id = p_share_id;

  insert into public.audit_events (actor_id, action, object_type, object_id, outcome)
  values (auth.uid(), 'revoke_report_share', 'report_shares', p_share_id, 'revoked');

  return true;
end;
$$;

-- RPC: create_consultation_request
create function public.create_consultation_request(
  p_psychologist_id uuid,
  p_child_id uuid,
  p_report_share_id uuid,
  p_requested_time timestamptz,
  p_notes text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g_link public.guardian_links%rowtype;
  psy public.psychologist_profiles%rowtype;
  req_id uuid;
  sh_row public.report_shares%rowtype;
begin
  select * into g_link from public.guardian_links
    where child_id = p_child_id
      and guardian_id = auth.uid()
      and verification_status = 'verified'
      and revoked_at is null;
  if not found then
    raise exception 'Caller is not a verified guardian of child' using errcode = '42501';
  end if;

  select * into psy from public.psychologist_profiles
    where profile_id = p_psychologist_id
      and verification_status = 'verified';
  if not found then
    raise exception 'Psychologist not found or unverified' using errcode = '42501';
  end if;

  if p_report_share_id is not null then
    select * into sh_row from public.report_shares
      where id = p_report_share_id
        and guardian_link_id = g_link.id
        and psychologist_id = p_psychologist_id;
    if not found then
      raise exception 'Report share does not match guardian or psychologist' using errcode = '42501';
    end if;
  end if;

  insert into public.consultation_requests (
    guardian_link_id,
    psychologist_id,
    report_share_id,
    requested_time,
    notes
  ) values (
    g_link.id,
    psy.profile_id,
    p_report_share_id,
    p_requested_time,
    p_notes
  ) returning id into req_id;

  insert into public.audit_events (actor_id, action, object_type, object_id, outcome)
  values (auth.uid(), 'create_consultation_request', 'consultation_requests', req_id, 'success');

  return req_id;
end;
$$;

-- RPC: respond_consultation_request
create function public.respond_consultation_request(
  p_request_id uuid,
  p_status text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  req_row public.consultation_requests%rowtype;
begin
  if p_status not in ('accepted', 'declined', 'completed') then
    raise exception 'Invalid consultation status' using errcode = '22023';
  end if;

  select * into req_row from public.consultation_requests where id = p_request_id;
  if not found or req_row.psychologist_id <> auth.uid() then
    raise exception 'Consultation request not found or unauthorized' using errcode = '42501';
  end if;

  update public.consultation_requests
    set status = p_status, updated_at = clock_timestamp()
    where id = p_request_id;

  insert into public.audit_events (actor_id, action, object_type, object_id, outcome)
  values (auth.uid(), 'respond_consultation_request', 'consultation_requests', p_request_id, p_status);

  return true;
end;
$$;

-- Overwrite get_recording_playback_info to support authorized psychologists when include_audio=true
create or replace function public.get_recording_playback_info(p_recording_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec public.recordings%rowtype;
  sess public.assessment_sessions%rowtype;
  mat public.material_versions%rowtype;
  can_play boolean := false;
begin
  select * into rec from public.recordings where id = p_recording_id;
  if not found or rec.upload_status <> 'ready' then
    raise exception 'Recording unavailable' using errcode = '42501';
  end if;

  select * into sess from public.assessment_sessions where id = rec.session_id;
  select * into mat from public.material_versions where id = sess.material_version_id;

  -- 1. Teacher access (must be unlocked from student mode)
  if public.can_access_assigned_child(sess.child_id) then
    can_play := true;
  -- 2. Guardian access
  elsif public.can_access_guardian_child(sess.child_id) then
    can_play := true;
  -- 3. Psychologist access: strictly if active, non-expired, non-revoked share has include_audio = true
  elsif exists (
    select 1 from public.report_shares rs
    join public.report_versions rv on rv.id = rs.report_version_id
    where rv.session_id = sess.id
      and rs.psychologist_id = auth.uid()
      and rs.revoked_at is null
      and rs.expires_at > clock_timestamp()
      and (rs.scope->>'include_audio')::boolean = true
  ) then
    can_play := true;
  end if;

  if not can_play then raise exception 'Playback unauthorized' using errcode = '42501'; end if;

  -- Ensure parental consent still holds
  if not public.has_effective_consent(sess.child_id, 'recording', mat.notice_version, mat.processing_scope_version) then
    raise exception 'Recording consent revoked' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'recordingId', rec.id,
    'sessionId', sess.id,
    'storageObjectKey', rec.storage_object_key,
    'mimeType', rec.mime_type,
    'durationMs', rec.duration_ms,
    'byteSize', rec.byte_size,
    'contentHash', rec.content_hash
  );
end;
$$;

-- 6. Row Level Security
alter table public.audit_events enable row level security;
alter table public.psychologist_profiles enable row level security;
alter table public.report_shares enable row level security;
alter table public.consultation_requests enable row level security;

revoke all on public.audit_events, public.psychologist_profiles,
  public.report_shares, public.consultation_requests from public, anon, authenticated;

grant select on public.audit_events, public.psychologist_profiles,
  public.report_shares, public.consultation_requests to authenticated;
grant update (avatar_url, clinic_address, institution_name) on public.psychologist_profiles to authenticated;

-- Policies for psychologist_profiles
create policy psychologist_profiles_directory_read on public.psychologist_profiles
for select to authenticated using (
  verification_status = 'verified' or profile_id = (select auth.uid())
);

create policy psychologist_profiles_self_update on public.psychologist_profiles
for update to authenticated using (
  profile_id = (select auth.uid())
) with check (
  profile_id = (select auth.uid())
);

-- Policies for report_shares
create policy report_shares_guardian_read on public.report_shares
for select to authenticated using (
  exists (
    select 1 from public.guardian_links gl
    where gl.id = guardian_link_id and gl.guardian_id = (select auth.uid())
  )
);

create policy report_shares_psychologist_read on public.report_shares
for select to authenticated using (
  psychologist_id = (select auth.uid())
  and revoked_at is null
  and expires_at > clock_timestamp()
);

-- Policies for consultation_requests
create policy consultation_requests_guardian_read on public.consultation_requests
for select to authenticated using (
  exists (
    select 1 from public.guardian_links gl
    where gl.id = guardian_link_id and gl.guardian_id = (select auth.uid())
  )
);

create policy consultation_requests_psychologist_read on public.consultation_requests
for select to authenticated using (
  psychologist_id = (select auth.uid())
);

-- Policies for audit_events
create policy audit_events_actor_read on public.audit_events
for select to authenticated using (
  actor_id = (select auth.uid())
);

-- Extended policy for report_versions: allow psychologist to read when actively shared
create policy report_versions_psychologist_shared_read on public.report_versions
for select to authenticated using (
  status = 'published' and exists (
    select 1 from public.report_shares rs
    where rs.report_version_id = id
      and rs.psychologist_id = (select auth.uid())
      and rs.revoked_at is null
      and rs.expires_at > clock_timestamp()
  )
);

-- Extended policy for recordings: allow psychologist to read when actively shared WITH include_audio=true
create policy recordings_psychologist_shared_read on public.recordings
for select to authenticated using (
  exists (
    select 1 from public.report_shares rs
    join public.report_versions rv on rv.id = rs.report_version_id
    where rv.session_id = session_id
      and rs.psychologist_id = (select auth.uid())
      and rs.revoked_at is null
      and rs.expires_at > clock_timestamp()
      and (rs.scope->>'include_audio')::boolean = true
  )
);

-- Permissions on functions
revoke all on function public.protect_audit_events(),
  public.touch_psychologist_updated_at(),
  public.protect_report_share(),
  public.touch_consultation_updated_at() from public, anon, authenticated;

revoke all on function public.grant_report_share(uuid, uuid, text, timestamptz, boolean),
  public.revoke_report_share(uuid),
  public.create_consultation_request(uuid, uuid, uuid, timestamptz, text),
  public.respond_consultation_request(uuid, text) from public, anon;

grant execute on function public.grant_report_share(uuid, uuid, text, timestamptz, boolean),
  public.revoke_report_share(uuid),
  public.create_consultation_request(uuid, uuid, uuid, timestamptz, text),
  public.respond_consultation_request(uuid, text) to authenticated;

commit;
