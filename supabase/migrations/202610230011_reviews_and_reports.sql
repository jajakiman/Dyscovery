begin;
-- ponytail: versioned manual reviews, review annotations, and immutable published observation reports.

-- 1. REVIEW_REVISION table
create table public.review_revisions (
  id uuid primary key default gen_random_uuid(),
  task_attempt_id uuid not null references public.task_attempts(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  revision integer not null default 1 check (revision >= 1),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  rubric_result jsonb check (rubric_result is null or jsonb_typeof(rubric_result) = 'object'),
  finalized_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (task_attempt_id, revision)
);
create index review_revisions_attempt on public.review_revisions(task_attempt_id);

-- Trigger to prevent edits to finalized review revisions
create function public.protect_finalized_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'finalized' then
    raise exception 'Finalized review revisions are immutable; create a new revision';
  end if;
  return new;
end;
$$;

create trigger review_revision_immutable before update or delete on public.review_revisions
for each row execute function public.protect_finalized_review();

-- 2. REVIEW_ANNOTATION table
create table public.review_annotations (
  id uuid primary key default gen_random_uuid(),
  review_revision_id uuid not null references public.review_revisions(id) on delete cascade,
  source_ai_annotation_id uuid,
  recording_id uuid references public.recordings(id) on delete set null,
  finding text not null check (finding in ('match', 'substitution', 'omission', 'repetition', 'hesitation', 'unclear', 'general_observation')),
  evidence_location jsonb check (evidence_location is null or jsonb_typeof(evidence_location) = 'object'),
  note text check (note is null or char_length(btrim(note)) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp()
);
create index review_annotations_revision on public.review_annotations(review_revision_id);

create function public.protect_finalized_review_annotations() returns trigger
language plpgsql set search_path = '' as $$
declare
  rev_status text;
begin
  select status into rev_status from public.review_revisions
    where id = coalesce(new.review_revision_id, old.review_revision_id);
  if rev_status = 'finalized' then
    raise exception 'Cannot modify annotations of a finalized review revision';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger review_annotation_immutable before insert or update or delete on public.review_annotations
for each row execute function public.protect_finalized_review_annotations();

-- 3. REPORT_VERSION table
create table public.report_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete restrict,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft' check (status in ('draft', 'published')),
  findings_snapshot jsonb not null check (jsonb_typeof(findings_snapshot) = 'object'),
  guidance_version_id uuid,
  follow_up_origin text check (follow_up_origin is null or follow_up_origin in ('expert_rule', 'teacher_manual')),
  follow_up_text text check (follow_up_text is null or char_length(btrim(follow_up_text)) between 1 and 5000),
  published_by uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (session_id, version)
);
create index report_versions_session on public.report_versions(session_id);

-- Trigger to make published reports immutable
create function public.protect_published_report() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'published' then
    raise exception 'Published report versions are immutable; publish a new report version';
  end if;
  return new;
end;
$$;

create trigger report_version_immutable before update or delete on public.report_versions
for each row execute function public.protect_published_report();

-- 4. REPORT_REVIEW junction table
create table public.report_reviews (
  report_version_id uuid not null references public.report_versions(id) on delete restrict,
  review_revision_id uuid not null references public.review_revisions(id) on delete restrict,
  primary key (report_version_id, review_revision_id)
);

-- 5. RPCs
-- RPC: save_review_draft
create function public.save_review_draft(
  p_task_attempt_id uuid,
  p_rubric_result jsonb,
  p_annotations jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  attempt public.task_attempts%rowtype;
  sess public.assessment_sessions%rowtype;
  existing_rev public.review_revisions%rowtype;
  rev_id uuid;
  next_ver integer := 1;
  ann jsonb;
begin
  select * into attempt from public.task_attempts where id = p_task_attempt_id;
  if not found then raise exception 'Task attempt unavailable' using errcode = '42501'; end if;

  select * into sess from public.assessment_sessions where id = attempt.session_id;
  if not public.can_access_assigned_child(sess.child_id) then
    raise exception 'Teacher assignment required' using errcode = '42501';
  end if;

  -- Look for active draft revision for this attempt
  select * into existing_rev from public.review_revisions
    where task_attempt_id = attempt.id and status = 'draft'
    order by revision desc limit 1 for update;

  if existing_rev.id is not null then
    rev_id := existing_rev.id;
    update public.review_revisions set rubric_result = p_rubric_result where id = rev_id;
    delete from public.review_annotations where review_revision_id = rev_id;
  else
    select coalesce(max(revision), 0) + 1 into next_ver from public.review_revisions
      where task_attempt_id = attempt.id;

    insert into public.review_revisions(task_attempt_id, reviewer_id, revision, status, rubric_result)
      values (attempt.id, auth.uid(), next_ver, 'draft', p_rubric_result)
      returning id into rev_id;
  end if;

  if p_annotations is not null and jsonb_typeof(p_annotations) = 'array' then
    for ann in select * from jsonb_array_elements(p_annotations) loop
      insert into public.review_annotations(
        review_revision_id,
        finding,
        evidence_location,
        note,
        recording_id
      ) values (
        rev_id,
        ann->>'finding',
        ann->'evidenceLocation',
        ann->>'note',
        case when (ann->>'recordingId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             then (ann->>'recordingId')::uuid else null end
      );
    end loop;
  end if;

  return rev_id;
end;
$$;

-- RPC: finalize_review_revision
create function public.finalize_review_revision(p_review_revision_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rev public.review_revisions%rowtype;
  attempt public.task_attempts%rowtype;
  sess public.assessment_sessions%rowtype;
begin
  select * into rev from public.review_revisions where id = p_review_revision_id for update;
  if not found then raise exception 'Review revision not found' using errcode = '42501'; end if;
  if rev.status = 'finalized' then return jsonb_build_object('reviewRevisionId', rev.id, 'status', 'finalized'); end if;

  select * into attempt from public.task_attempts where id = rev.task_attempt_id;
  select * into sess from public.assessment_sessions where id = attempt.session_id;

  if not public.can_access_assigned_child(sess.child_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.review_revisions
    set status = 'finalized', finalized_at = clock_timestamp()
    where id = rev.id;

  return jsonb_build_object('reviewRevisionId', rev.id, 'status', 'finalized');
end;
$$;

-- RPC: publish_observation_report
create function public.publish_observation_report(
  p_session_id uuid,
  p_findings_snapshot jsonb,
  p_follow_up_text text,
  p_follow_up_origin text,
  p_review_revision_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  sess public.assessment_sessions%rowtype;
  next_version integer := 1;
  rep_id uuid;
  rev_id uuid;
  rev public.review_revisions%rowtype;
begin
  if p_findings_snapshot is null or jsonb_typeof(p_findings_snapshot) <> 'object' then
    raise exception 'Invalid findings snapshot' using errcode = '22023';
  end if;
  if p_follow_up_origin is not null and p_follow_up_origin not in ('expert_rule', 'teacher_manual') then
    raise exception 'Invalid follow-up origin' using errcode = '22023';
  end if;

  select * into sess from public.assessment_sessions where id = p_session_id;
  if not found or sess.status <> 'completed' then
    raise exception 'Completed session required for report publication' using errcode = '22023';
  end if;

  if not public.can_access_assigned_child(sess.child_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select coalesce(max(version), 0) + 1 into next_version from public.report_versions
    where session_id = sess.id;

  insert into public.report_versions(
    session_id,
    version,
    status,
    findings_snapshot,
    follow_up_origin,
    follow_up_text,
    published_by,
    published_at
  ) values (
    sess.id,
    next_version,
    'published',
    p_findings_snapshot,
    p_follow_up_origin,
    p_follow_up_text,
    auth.uid(),
    clock_timestamp()
  ) returning id into rep_id;

  if p_review_revision_ids is not null then
    foreach rev_id in array p_review_revision_ids loop
      select * into rev from public.review_revisions where id = rev_id;
      if rev.id is not null and rev.status = 'finalized' then
        insert into public.report_reviews(report_version_id, review_revision_id)
          values (rep_id, rev.id) on conflict do nothing;
      end if;
    end loop;
  end if;

  return jsonb_build_object('reportVersionId', rep_id, 'version', next_version, 'status', 'published');
end;
$$;

-- RLS
alter table public.review_revisions enable row level security;
alter table public.review_annotations enable row level security;
alter table public.report_versions enable row level security;
alter table public.report_reviews enable row level security;

revoke all on public.review_revisions, public.review_annotations,
  public.report_versions, public.report_reviews from public, anon, authenticated;
grant select on public.review_revisions, public.review_annotations,
  public.report_versions, public.report_reviews to authenticated;

create policy review_revisions_select on public.review_revisions for select to authenticated using (
  exists (
    select 1 from public.task_attempts a
      join public.assessment_sessions s on s.id = a.session_id
      where a.id = task_attempt_id
        and (public.can_access_assigned_child(s.child_id)
          or (review_revisions.status = 'finalized' and public.can_access_guardian_child(s.child_id)))
  )
);

create policy review_annotations_select on public.review_annotations for select to authenticated using (
  exists (select 1 from public.review_revisions r where r.id = review_revision_id)
);

create policy report_versions_select on public.report_versions for select to authenticated using (
  exists (
    select 1 from public.assessment_sessions s
      where s.id = session_id
        and (public.can_access_assigned_child(s.child_id)
          or (report_versions.status = 'published' and public.can_access_guardian_child(s.child_id)))
  )
);

create policy report_reviews_select on public.report_reviews for select to authenticated using (
  exists (select 1 from public.report_versions v where v.id = report_version_id)
);

revoke all on function public.protect_finalized_review(),
  public.protect_finalized_review_annotations(),
  public.protect_published_report() from public, anon, authenticated;
revoke all on function public.save_review_draft(uuid, jsonb, jsonb),
  public.finalize_review_revision(uuid),
  public.publish_observation_report(uuid, jsonb, text, text, uuid[]) from public, anon;
grant execute on function public.save_review_draft(uuid, jsonb, jsonb),
  public.finalize_review_revision(uuid),
  public.publish_observation_report(uuid, jsonb, text, text, uuid[]) to authenticated;

commit;
