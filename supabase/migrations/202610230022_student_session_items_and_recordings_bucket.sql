begin;
-- Layer 4: stimulus for the locked student session. Protocol 'reading-5pos-v1'; answer keys are never returned.
create function public.student_session_items() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mode jsonb; definition jsonb; current_id uuid; items jsonb;
begin
  mode := public.current_student_mode();
  if mode->>'mode' <> 'student' then raise exception 'Student access unavailable' using errcode='42501'; end if;
  current_id := (mode->>'sessionId')::uuid;
  select v.definition into definition from public.assessment_sessions s
    join public.material_versions v on v.id=s.material_version_id
    where s.id=current_id and s.status='in_progress' and v.approval_status='approved';
  if definition is null or definition->>'protocol' is distinct from 'reading-5pos-v1'
    or jsonb_typeof(definition->'items') is distinct from 'array' then
    raise exception 'Reading protocol unavailable' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('key',i->>'key','phase',i->>'phase',
      'encounterType',i->>'encounterType','prompt',i->>'prompt') order by o), '[]'::jsonb) into items
    from jsonb_array_elements(definition->'items') with ordinality t(i,o)
    where i->>'key' ~ '^[a-z0-9-]{1,80}$'
      and i->>'encounterType' in ('letter_arrange','spelling_image','word_read','passage_read','comprehension')
      and i->>'phase' in ('warmup','practice','screening')
      and char_length(i->>'prompt') between 1 and 600;
  if jsonb_array_length(items) = 0 then raise exception 'Reading protocol unavailable' using errcode='22023'; end if;
  return jsonb_build_object('sessionId',current_id,'items',items,
    'done',coalesce((select jsonb_agg(a.item_key) from public.task_attempts a where a.session_id=current_id),'[]'::jsonb));
end;
$$;
revoke all on function public.student_session_items() from public,anon;
grant execute on function public.student_session_items() to authenticated;

-- Private bucket for recordings (previously undefined in any migration).
insert into storage.buckets(id,name,public,file_size_limit)
  values ('private-recordings','private-recordings',false,26214400) on conflict (id) do nothing;

create function public.can_upload_recording(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.recordings r
    where r.storage_object_key=p_key and r.upload_status='pending_upload'
      and (public.current_student_mode()->>'mode')='student'
      and r.session_id=((public.current_student_mode()->>'sessionId')::uuid));
$$;
create function public.can_read_recording_object(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.recordings r join public.assessment_sessions s on s.id=r.session_id
    where r.storage_object_key=p_key and r.upload_status='ready'
      and (public.can_access_assigned_child(s.child_id) or public.can_access_guardian_child(s.child_id)));
$$;
revoke all on function public.can_upload_recording(text),public.can_read_recording_object(text) from public,anon;
grant execute on function public.can_upload_recording(text),public.can_read_recording_object(text) to authenticated;

create policy private_recordings_upload on storage.objects for insert to authenticated
  with check (bucket_id='private-recordings' and public.can_upload_recording(name));
create policy private_recordings_read on storage.objects for select to authenticated
  using (bucket_id='private-recordings' and public.can_read_recording_object(name));
commit;
