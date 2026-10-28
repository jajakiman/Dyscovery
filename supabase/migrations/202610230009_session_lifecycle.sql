begin;
-- ponytail: session lifecycle, task attempts, and append-only session events.

-- 1. Extend assessment_sessions lifecycle columns and status constraints
alter table public.assessment_sessions
  drop constraint if exists assessment_sessions_status_check;

alter table public.assessment_sessions
  add constraint assessment_sessions_status_check
  check (status in ('draft', 'in_progress', 'completed', 'cancelled'));

alter table public.assessment_sessions
  add column if not exists theme_key text not null default 'forest_adventure' check (char_length(btrim(theme_key)) between 1 and 50),
  add column if not exists presentation_context jsonb not null default '{}'::jsonb check (jsonb_typeof(presentation_context) = 'object'),
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

alter table public.assessment_sessions
  add constraint assessment_sessions_time_order
  check (started_at is null or ended_at is null or ended_at >= started_at);

-- 2. Create task_attempts table (accommodates interactive student responses across adventure encounters)
create table public.task_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  item_key text not null check (char_length(btrim(item_key)) between 1 and 80 and item_key ~ '^[a-z0-9-]{1,80}$'),
  encounter_type text not null check (encounter_type in ('letter_arrange', 'spelling_image', 'word_read', 'passage_read', 'comprehension')),
  phase text not null check (phase in ('warmup', 'practice', 'screening')),
  attempt_number integer not null default 1 check (attempt_number >= 1),
  response jsonb check (response is null or jsonb_typeof(response) in ('object', 'array', 'string')),
  request_id uuid not null,
  status text not null default 'completed' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz not null default clock_timestamp(),
  unique (session_id, item_key, attempt_number),
  unique (session_id, request_id)
);
create index task_attempts_session on public.task_attempts(session_id);

-- 3. Create session_events table (append-only timeline log of session lifecycle & interruptions)
create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('session_started', 'pause_requested', 'resumed', 'teacher_called', 'session_completed', 'session_cancelled')),
  note text check (note is null or char_length(btrim(note)) between 1 and 500),
  occurred_at timestamptz not null default clock_timestamp()
);
create index session_events_session on public.session_events(session_id, occurred_at);

create function public.protect_session_event_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Session events are append-only';
end;
$$;

create trigger session_events_immutable before update or delete on public.session_events
for each row execute function public.protect_session_event_append_only();

-- 4. RPCs for lifecycle management
-- RPC: start_assessment_session
create function public.start_assessment_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sess public.assessment_sessions%rowtype;
begin
  select s.* into sess from public.assessment_sessions s
    join public.teacher_assignments a on a.id = s.teacher_assignment_id
    join public.school_members m on m.id = a.school_member_id
    where s.id = p_session_id and m.profile_id = auth.uid() for update of s;
  if not found then raise exception 'Session unavailable' using errcode = '42501'; end if;
  if sess.status <> 'draft' then raise exception 'Session already started or closed' using errcode = '22023'; end if;
  if not public.can_access_assigned_child(sess.child_id) then raise exception 'Access denied' using errcode = '42501'; end if;

  update public.assessment_sessions
    set status = 'in_progress', started_at = clock_timestamp()
    where id = sess.id;

  insert into public.session_events(session_id, actor_id, event_type)
    values (sess.id, auth.uid(), 'session_started');

  return jsonb_build_object('sessionId', sess.id, 'status', 'in_progress');
end;
$$;

-- RPC: record_session_event
create function public.record_session_event(p_session_id uuid, p_event_type text, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  sess public.assessment_sessions%rowtype;
  mode jsonb;
  event_id uuid;
begin
  if p_event_type not in ('pause_requested', 'resumed', 'teacher_called') then
    raise exception 'Invalid session event type' using errcode = '22023';
  end if;
  if p_note is not null and char_length(btrim(p_note)) not between 1 and 500 then
    raise exception 'Invalid note length' using errcode = '22023';
  end if;

  mode := public.current_student_mode();
  if mode->>'mode' = 'student' and (mode->>'sessionId')::uuid = p_session_id then
    select * into sess from public.assessment_sessions where id = p_session_id;
  else
    select s.* into sess from public.assessment_sessions s
      join public.teacher_assignments a on a.id = s.teacher_assignment_id
      join public.school_members m on m.id = a.school_member_id
      where s.id = p_session_id and m.profile_id = auth.uid();
  end if;

  if sess.id is null then raise exception 'Session unavailable' using errcode = '42501'; end if;
  if sess.status <> 'in_progress' then raise exception 'Session not in progress' using errcode = '22023'; end if;

  insert into public.session_events(session_id, actor_id, event_type, note)
    values (sess.id, auth.uid(), p_event_type, p_note)
    returning id into event_id;

  return event_id;
end;
$$;

-- RPC: save_task_attempt
create function public.save_task_attempt(
  p_item_key text,
  p_encounter_type text,
  p_phase text,
  p_response jsonb,
  p_request_id uuid,
  p_attempt_number integer default 1
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  mode jsonb;
  current_id uuid;
  saved public.task_attempts%rowtype;
begin
  if p_item_key is null or p_item_key !~ '^[a-z0-9-]{1,80}$'
    or p_encounter_type not in ('letter_arrange', 'spelling_image', 'word_read', 'passage_read', 'comprehension')
    or p_phase not in ('warmup', 'practice', 'screening')
    or p_attempt_number is null or p_attempt_number < 1
    or p_request_id is null then
    raise exception 'Invalid task attempt parameters' using errcode = '22023';
  end if;

  mode := public.current_student_mode();
  if mode->>'mode' <> 'student' then raise exception 'Student access unavailable' using errcode = '42501'; end if;
  current_id := (mode->>'sessionId')::uuid;

  perform 1 from public.assessment_sessions where id = current_id and status = 'in_progress' for update;
  if not found then raise exception 'Session not active' using errcode = '42501'; end if;

  select * into saved from public.task_attempts
    where session_id = current_id and (request_id = p_request_id or (item_key = p_item_key and attempt_number = p_attempt_number));
  if found then
    if saved.request_id = p_request_id and saved.item_key = p_item_key
       and saved.encounter_type = p_encounter_type and saved.phase = p_phase
       and saved.attempt_number = p_attempt_number
       and saved.response is not distinct from p_response then
      return saved.id;
    end if;
    raise exception 'Task attempt already submitted' using errcode = '22023';
  end if;

  insert into public.task_attempts(session_id, item_key, encounter_type, phase, attempt_number, response, request_id)
    values (current_id, p_item_key, p_encounter_type, p_phase, p_attempt_number, p_response, p_request_id)
    returning id into saved.id;

  return saved.id;
end;
$$;

-- RPC: complete_assessment_session
create function public.complete_assessment_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sess public.assessment_sessions%rowtype;
  mode jsonb;
begin
  mode := public.current_student_mode();
  if mode->>'mode' = 'student' and (mode->>'sessionId')::uuid = p_session_id then
    select * into sess from public.assessment_sessions where id = p_session_id for update;
  else
    select s.* into sess from public.assessment_sessions s
      join public.teacher_assignments a on a.id = s.teacher_assignment_id
      join public.school_members m on m.id = a.school_member_id
      where s.id = p_session_id and m.profile_id = auth.uid() for update of s;
  end if;

  if sess.id is null then raise exception 'Session unavailable' using errcode = '42501'; end if;
  if sess.status <> 'in_progress' then raise exception 'Session not in progress' using errcode = '22023'; end if;

  update public.assessment_sessions
    set status = 'completed', ended_at = clock_timestamp()
    where id = sess.id;

  insert into public.session_events(session_id, actor_id, event_type)
    values (sess.id, auth.uid(), 'session_completed');

  return jsonb_build_object('sessionId', sess.id, 'status', 'completed');
end;
$$;

-- 5. RLS and permissions
alter table public.task_attempts enable row level security;
alter table public.session_events enable row level security;

revoke all on public.task_attempts, public.session_events from public, anon, authenticated;
grant select on public.task_attempts, public.session_events to authenticated;

create policy task_attempts_session_read on public.task_attempts for select to authenticated using (
  exists (select 1 from public.assessment_sessions s where s.id = session_id)
);

create policy session_events_session_read on public.session_events for select to authenticated using (
  exists (select 1 from public.assessment_sessions s where s.id = session_id)
);

revoke all on function public.protect_session_event_append_only() from public, anon, authenticated;
revoke all on function public.start_assessment_session(uuid),
  public.record_session_event(uuid, text, text),
  public.save_task_attempt(text, text, text, jsonb, uuid, integer),
  public.complete_assessment_session(uuid) from public, anon;
grant execute on function public.start_assessment_session(uuid),
  public.record_session_event(uuid, text, text),
  public.save_task_attempt(text, text, text, jsonb, uuid, integer),
  public.complete_assessment_session(uuid) to authenticated;

commit;
