begin;
-- ponytail: private audio recordings vault, task-linked upload authorization, and playback access control.

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  task_attempt_id uuid not null references public.task_attempts(id) on delete restrict,
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  storage_object_key text not null unique check (char_length(btrim(storage_object_key)) between 10 and 200),
  upload_status text not null default 'pending_upload' check (upload_status in ('pending_upload', 'ready', 'failed')),
  content_hash text check (content_hash is null or char_length(content_hash) between 16 and 128),
  duration_ms integer check (duration_ms is null or duration_ms between 100 and 1800000),
  byte_size integer check (byte_size is null or byte_size between 1 and 26214400),
  mime_type text not null check (mime_type in ('audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4')),
  created_at timestamptz not null default clock_timestamp(),
  finalized_at timestamptz
);
create index recordings_task_attempt on public.recordings(task_attempt_id);
create index recordings_session on public.recordings(session_id);

-- Enforce maximum of 1 ready recording per task attempt (retry adds new record without silent overwrite)
create unique index recordings_one_ready_per_attempt on public.recordings(task_attempt_id)
  where (upload_status = 'ready');

-- RPC: request_audio_upload
create function public.request_audio_upload(p_task_attempt_id uuid, p_mime_type text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.task_attempts%rowtype;
  sess public.assessment_sessions%rowtype;
  mat public.material_versions%rowtype;
  rec_id uuid := gen_random_uuid();
  ext text;
  obj_key text;
  mode jsonb;
begin
  if p_mime_type not in ('audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4') then
    raise exception 'Unsupported mime type' using errcode = '22023';
  end if;

  select * into attempt from public.task_attempts where id = p_task_attempt_id;
  if not found then raise exception 'Task attempt not found' using errcode = '42501'; end if;

  select * into sess from public.assessment_sessions where id = attempt.session_id;
  if not found or sess.status <> 'in_progress' then
    raise exception 'Session not active' using errcode = '42501';
  end if;

  select * into mat from public.material_versions where id = sess.material_version_id;
  if not found then raise exception 'Material unavailable' using errcode = '42501'; end if;

  -- Verify active student mode or authorized teacher
  mode := public.current_student_mode();
  if mode->>'mode' = 'student' and (mode->>'sessionId')::uuid = sess.id then
    null;
  elsif not public.can_access_assigned_child(sess.child_id) then
    raise exception 'Unauthorized audio request' using errcode = '42501';
  end if;

  -- Mandatory verification: effective consent for purpose = 'recording'
  if not public.has_effective_consent(sess.child_id, 'recording', mat.notice_version, mat.processing_scope_version) then
    raise exception 'Recording consent required' using errcode = '42501';
  end if;

  case p_mime_type
    when 'audio/webm' then ext := 'webm';
    when 'audio/ogg' then ext := 'ogg';
    when 'audio/wav' then ext := 'wav';
    when 'audio/mp4' then ext := 'mp4';
  end case;

  -- Internal anonymized key: recordings/{sessionId}/{recordingId}.{ext}
  obj_key := 'recordings/' || sess.id::text || '/' || rec_id::text || '.' || ext;

  insert into public.recordings(id, task_attempt_id, session_id, storage_object_key, upload_status, mime_type)
    values (rec_id, attempt.id, sess.id, obj_key, 'pending_upload', p_mime_type);

  return jsonb_build_object(
    'recordingId', rec_id,
    'sessionId', sess.id,
    'storageObjectKey', obj_key,
    'mimeType', p_mime_type
  );
end;
$$;

-- RPC: finalize_audio_upload
create function public.finalize_audio_upload(
  p_recording_id uuid,
  p_content_hash text,
  p_byte_size integer,
  p_duration_ms integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec public.recordings%rowtype;
  sess public.assessment_sessions%rowtype;
  mode jsonb;
begin
  if p_content_hash is null or char_length(btrim(p_content_hash)) not between 16 and 128
    or p_byte_size is null or p_byte_size not between 1 and 26214400
    or p_duration_ms is null or p_duration_ms not between 100 and 1800000 then
    raise exception 'Invalid audio metadata' using errcode = '22023';
  end if;

  select * into rec from public.recordings where id = p_recording_id for update;
  if not found then raise exception 'Recording not found' using errcode = '42501'; end if;
  if rec.upload_status = 'ready' then return jsonb_build_object('recordingId', rec.id, 'status', 'ready'); end if;

  select * into sess from public.assessment_sessions where id = rec.session_id;
  mode := public.current_student_mode();
  if mode->>'mode' = 'student' and (mode->>'sessionId')::uuid = sess.id then
    null;
  elsif not public.can_access_assigned_child(sess.child_id) then
    raise exception 'Unauthorized audio finalization' using errcode = '42501';
  end if;

  update public.recordings
    set upload_status = 'ready',
        content_hash = p_content_hash,
        byte_size = p_byte_size,
        duration_ms = p_duration_ms,
        finalized_at = clock_timestamp()
    where id = rec.id;

  return jsonb_build_object('recordingId', rec.id, 'status', 'ready');
end;
$$;

-- RPC: get_recording_playback_info
create function public.get_recording_playback_info(p_recording_id uuid) returns jsonb
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
  end if;

  if not can_play then raise exception 'Playback unauthorized' using errcode = '42501'; end if;

  -- Ensure consent still holds
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

-- RLS and permissions
alter table public.recordings enable row level security;
revoke all on public.recordings from public, anon, authenticated;
grant select on public.recordings to authenticated;

create policy recordings_authorized_read on public.recordings for select to authenticated using (
  exists (
    select 1 from public.assessment_sessions s
      join public.material_versions v on v.id = s.material_version_id
      where s.id = session_id
        and (public.can_access_assigned_child(s.child_id) or public.can_access_guardian_child(s.child_id))
        and public.has_effective_consent(s.child_id, 'recording', v.notice_version, v.processing_scope_version)
  )
);

revoke all on function public.request_audio_upload(uuid, text),
  public.finalize_audio_upload(uuid, text, integer, integer),
  public.get_recording_playback_info(uuid) from public, anon;
grant execute on function public.request_audio_upload(uuid, text),
  public.finalize_audio_upload(uuid, text, integer, integer),
  public.get_recording_playback_info(uuid) to authenticated;

commit;
