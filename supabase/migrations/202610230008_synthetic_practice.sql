begin;
-- ponytail: synthetic practice only; real assessment needs an approved instrument/protocol.
create table public.practice_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  item_key text not null,
  response text not null check (char_length(btrim(response)) between 1 and 500),
  request_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(session_id,item_key),
  unique(session_id,request_id)
);
alter table public.practice_responses enable row level security;
revoke all on public.practice_responses from public,anon,authenticated;
grant select on public.practice_responses to authenticated;
create policy practice_teacher_read on public.practice_responses for select to authenticated using (
  exists(select 1 from public.assessment_sessions s where s.id=session_id)
);

create function public.student_practice() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mode jsonb; definition jsonb; current_id uuid;
begin
  mode := public.current_student_mode();
  if mode->>'mode' <> 'student' then raise exception 'Student access unavailable' using errcode='42501'; end if;
  current_id := (mode->>'sessionId')::uuid;
  select v.definition into definition from public.assessment_sessions s
    join public.material_versions v on v.id=s.material_version_id where s.id=current_id;
  if definition->'synthetic' is distinct from 'true'::jsonb
    or definition->>'protocol' is distinct from 'text-practice-v1'
    or jsonb_typeof(definition->'items') is distinct from 'array'
    or jsonb_array_length(definition->'items') <> 1 then
    raise exception 'Synthetic practice material required' using errcode='22023';
  end if;
  if not exists(select 1 from jsonb_array_elements(definition->'items') i
    where i->>'key' ~ '^[a-z0-9-]{1,80}$' and i->>'phase'='practice'
      and char_length(i->>'prompt') between 1 and 500) then
    raise exception 'Invalid practice item' using errcode='22023';
  end if;
  return jsonb_build_object('sessionId',current_id,'items',definition->'items',
    'responses',coalesce((select jsonb_agg(jsonb_build_object('itemKey',r.item_key,'response',r.response))
      from public.practice_responses r where r.session_id=current_id),'[]'::jsonb));
end;
$$;

create function public.save_student_practice(p_item_key text,p_response text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare payload jsonb; current_id uuid; saved public.practice_responses%rowtype;
begin
  perform 1 from public.teacher_device_modes where teacher_id=auth.uid() for update;
  perform 1 from public.children c join public.assessment_sessions s on s.child_id=c.id
    join public.teacher_device_modes m on m.session_id=s.id where m.teacher_id=auth.uid() for update of c;
  payload := public.student_practice();
  current_id := (payload->>'sessionId')::uuid;
  if p_response is null or char_length(btrim(p_response)) not between 1 and 500
    or p_request_id is null or not exists(select 1 from jsonb_array_elements(payload->'items') i where i->>'key'=p_item_key) then
    raise exception 'Invalid practice response' using errcode='22023';
  end if;
  select * into saved from public.practice_responses where session_id=current_id
    and (item_key=p_item_key or request_id=p_request_id);
  if found then
    if saved.item_key=p_item_key and saved.request_id=p_request_id and saved.response=p_response then return saved.id; end if;
    raise exception 'Practice response already submitted' using errcode='22023';
  end if;
  insert into public.practice_responses(session_id,item_key,response,request_id)
    values(current_id,p_item_key,p_response,p_request_id) returning id into saved.id;
  return saved.id;
end;
$$;
revoke all on function public.student_practice(),public.save_student_practice(text,text,uuid) from public,anon;
grant execute on function public.student_practice(),public.save_student_practice(text,text,uuid) to authenticated;
commit;
