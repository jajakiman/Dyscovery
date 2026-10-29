begin;
-- ponytail: post-recording AI pipeline, candidate annotations drafting assistant, and consent/provider gates.

-- 1. AI_ANALYSIS table
create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings(id) on delete restrict,
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  provider text not null default 'pretrained-asr-alignment' check (char_length(btrim(provider)) between 2 and 50),
  model_version text not null default 'id-phone-v1' check (char_length(btrim(model_version)) between 1 and 50),
  pipeline_version text not null default 'post-rec-v1' check (char_length(btrim(pipeline_version)) between 1 and 50),
  input_hash text not null check (char_length(btrim(input_hash)) between 16 and 128),
  idempotency_key text not null unique check (char_length(btrim(idempotency_key)) between 10 and 120),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  processing_latency_ms integer check (processing_latency_ms is null or processing_latency_ms between 0 and 60000),
  error_message text check (error_message is null or char_length(btrim(error_message)) between 1 and 500),
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index ai_analyses_recording on public.ai_analyses(recording_id);
create index ai_analyses_session on public.ai_analyses(session_id);

-- 2. AI_ANNOTATION table
create table public.ai_annotations (
  id uuid primary key default gen_random_uuid(),
  ai_analysis_id uuid not null references public.ai_analyses(id) on delete cascade,
  reference_start integer check (reference_start is null or reference_start >= 0),
  reference_end integer check (reference_end is null or (reference_start is not null and reference_end >= reference_start)),
  audio_start_ms integer check (audio_start_ms is null or audio_start_ms >= 0),
  audio_end_ms integer check (audio_end_ms is null or (audio_start_ms is not null and audio_end_ms >= audio_start_ms)),
  annotation_type text not null check (annotation_type in ('match', 'substitution', 'omission', 'repetition', 'hesitation', 'unclear')),
  observed_text text check (observed_text is null or char_length(btrim(observed_text)) between 1 and 500),
  confidence_score float check (confidence_score is null or (confidence_score >= 0.0 and confidence_score <= 1.0)),
  created_at timestamptz not null default clock_timestamp()
);
create index ai_annotations_analysis on public.ai_annotations(ai_analysis_id);

-- Add foreign key constraint to review_annotations.source_ai_annotation_id
alter table public.review_annotations
  add constraint review_annotations_ai_fk
  foreign key (source_ai_annotation_id) references public.ai_annotations(id) on delete set null;

-- 3. RPC: request_ai_analysis
create function public.request_ai_analysis(
  p_recording_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rec public.recordings%rowtype;
  sess public.assessment_sessions%rowtype;
  mat public.material_versions%rowtype;
  existing public.ai_analyses%rowtype;
  analysis_id uuid;
begin
  if p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 10 and 120 then
    raise exception 'Invalid idempotency key' using errcode = '22023';
  end if;

  select * into rec from public.recordings where id = p_recording_id;
  if not found or rec.upload_status <> 'ready' then
    raise exception 'Recording unavailable or not ready' using errcode = '42501';
  end if;

  select * into sess from public.assessment_sessions where id = rec.session_id;
  select * into mat from public.material_versions where id = sess.material_version_id;

  -- Verify assigned teacher (must be unlocked from student mode) or guardian
  if not public.can_access_assigned_child(sess.child_id) and not public.can_access_guardian_child(sess.child_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  -- Mandatory check: Parental consent for 'ai' purpose
  if not public.has_effective_consent(sess.child_id, 'ai', mat.notice_version, mat.processing_scope_version) then
    raise exception 'AI processing consent required' using errcode = '42501';
  end if;

  -- Check existing idempotency key
  select * into existing from public.ai_analyses where idempotency_key = p_idempotency_key;
  if existing.id is not null then
    return jsonb_build_object(
      'analysisId', existing.id,
      'status', existing.status,
      'recordingId', existing.recording_id
    );
  end if;

  insert into public.ai_analyses(
    recording_id,
    session_id,
    input_hash,
    idempotency_key,
    status
  ) values (
    rec.id,
    sess.id,
    rec.content_hash,
    p_idempotency_key,
    'queued'
  ) returning id into analysis_id;

  return jsonb_build_object(
    'analysisId', analysis_id,
    'status', 'queued',
    'recordingId', rec.id
  );
end;
$$;

-- 4. RPC: record_ai_analysis_results
create function public.record_ai_analysis_results(
  p_analysis_id uuid,
  p_status text,
  p_processing_latency_ms integer,
  p_annotations jsonb,
  p_error_message text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  analysis public.ai_analyses%rowtype;
  ann jsonb;
begin
  if p_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  select * into analysis from public.ai_analyses where id = p_analysis_id for update;
  if not found then raise exception 'Analysis record not found' using errcode = '42501'; end if;

  update public.ai_analyses
    set status = p_status,
        processing_latency_ms = p_processing_latency_ms,
        error_message = p_error_message,
        completed_at = clock_timestamp()
    where id = analysis.id;

  if p_status = 'completed' and p_annotations is not null and jsonb_typeof(p_annotations) = 'array' then
    for ann in select * from jsonb_array_elements(p_annotations) loop
      insert into public.ai_annotations(
        ai_analysis_id,
        reference_start,
        reference_end,
        audio_start_ms,
        audio_end_ms,
        annotation_type,
        observed_text,
        confidence_score
      ) values (
        analysis.id,
        (ann->>'referenceStart')::integer,
        (ann->>'referenceEnd')::integer,
        (ann->>'audioStartMs')::integer,
        (ann->>'audioEndMs')::integer,
        ann->>'annotationType',
        ann->>'observedText',
        (ann->>'confidenceScore')::float
      );
    end loop;
  end if;

  return jsonb_build_object('analysisId', analysis.id, 'status', p_status);
end;
$$;

-- 5. RLS
alter table public.ai_analyses enable row level security;
alter table public.ai_annotations enable row level security;

revoke all on public.ai_analyses, public.ai_annotations from public, anon, authenticated;
grant select on public.ai_analyses, public.ai_annotations to authenticated;

create policy ai_analyses_select on public.ai_analyses for select to authenticated using (
  exists (
    select 1 from public.assessment_sessions s
      join public.material_versions v on v.id = s.material_version_id
      where s.id = session_id
        and (public.can_access_assigned_child(s.child_id) or public.can_access_guardian_child(s.child_id))
        and public.has_effective_consent(s.child_id, 'ai', v.notice_version, v.processing_scope_version)
  )
);

create policy ai_annotations_select on public.ai_annotations for select to authenticated using (
  exists (
    select 1 from public.ai_analyses a
      where a.id = ai_analysis_id
  )
);

revoke all on function public.request_ai_analysis(uuid, text),
  public.record_ai_analysis_results(uuid, text, integer, jsonb, text) from public, anon;
grant execute on function public.request_ai_analysis(uuid, text),
  public.record_ai_analysis_results(uuid, text, integer, jsonb, text) to authenticated;

commit;
