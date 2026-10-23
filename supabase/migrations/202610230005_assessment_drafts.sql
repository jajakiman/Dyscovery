begin;
create table public.material_versions (
  id uuid primary key default gen_random_uuid(),
  material_key text not null check (char_length(btrim(material_key)) between 1 and 100),
  version integer not null check (version > 0),
  approval_status text not null default 'draft' check (approval_status in ('draft','approved','retired')),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  content_hash text generated always as (pg_catalog.md5(definition::text)) stored,
  activity_purpose text not null default 'activity' check (activity_purpose = 'activity'),
  notice_version text not null,
  processing_scope_version text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (material_key,version),
  foreign key (activity_purpose,notice_version,processing_scope_version)
    references public.consent_notices(purpose,notice_version,processing_scope_version) on delete restrict
);
create function public.protect_material_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'approval_status' - 'content_hash') = (to_jsonb(old) - 'approval_status' - 'content_hash') then
    return new;
  end if;
  raise exception 'Material versions are immutable; publish a new version';
end;
$$;
create trigger material_version_immutable before update or delete on public.material_versions
for each row execute function public.protect_material_version();

-- ponytail: drafts only; student capability isolation must precede session execution.
create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  teacher_assignment_id uuid not null references public.teacher_assignments(id) on delete restrict,
  material_version_id uuid not null references public.material_versions(id) on delete restrict,
  status text not null default 'draft' check (status = 'draft'),
  created_at timestamptz not null default clock_timestamp()
);
create index assessment_sessions_child on public.assessment_sessions(child_id);
create index assessment_sessions_assignment on public.assessment_sessions(teacher_assignment_id);
create unique index assessment_sessions_one_draft on public.assessment_sessions(teacher_assignment_id,material_version_id);

create function public.create_assessment_draft(p_teacher_assignment_id uuid, p_material_version_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  assignment public.teacher_assignments%rowtype;
  material public.material_versions%rowtype;
  session_id uuid;
begin
  select a.* into assignment from public.teacher_assignments a
    join public.school_members m on m.id = a.school_member_id and m.school_id = a.school_id
    where a.id = p_teacher_assignment_id and m.profile_id = auth.uid() for share of a,m;
  if not found then raise exception 'Assignment unavailable' using errcode = '42501'; end if;
  perform 1 from public.children where id = assignment.child_id for update;
  if not public.can_access_assigned_child(assignment.child_id)
    or assignment.status <> 'active' or assignment.starts_at > now()
    or (assignment.ends_at is not null and assignment.ends_at <= now()) then
    raise exception 'Assignment unavailable' using errcode = '42501';
  end if;
  select * into material from public.material_versions where id = p_material_version_id
    and approval_status = 'approved' for share;
  if not found then raise exception 'Approved material unavailable' using errcode = '22023'; end if;
  perform 1 from public.consent_notices where purpose = 'activity'
    and notice_version = material.notice_version and processing_scope_version = material.processing_scope_version for share;
  if not public.has_effective_consent(assignment.child_id,'activity',material.notice_version,material.processing_scope_version) then
    raise exception 'Activity consent required' using errcode = '42501';
  end if;
  insert into public.assessment_sessions(child_id,teacher_assignment_id,material_version_id)
    values(assignment.child_id,assignment.id,material.id)
    on conflict (teacher_assignment_id,material_version_id) do nothing returning id into session_id;
  if session_id is null then
    select id into session_id from public.assessment_sessions
      where teacher_assignment_id = assignment.id and material_version_id = material.id;
  end if;
  return session_id;
end;
$$;

alter table public.material_versions enable row level security;
alter table public.assessment_sessions enable row level security;
revoke all on public.material_versions,public.assessment_sessions from public,anon,authenticated;
grant select on public.material_versions,public.assessment_sessions to authenticated;
create policy materials_teacher_read on public.material_versions for select to authenticated using (
  approval_status = 'approved' and exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.product_role = 'teacher' and p.verification_status = 'verified' and p.account_status = 'active')
);
create policy sessions_assigned_read on public.assessment_sessions for select to authenticated using (
  public.can_access_assigned_child(child_id) and exists (
    select 1 from public.material_versions v where v.id = material_version_id
      and public.has_effective_consent(child_id,'activity',v.notice_version,v.processing_scope_version))
);
revoke all on function public.protect_material_version() from public,anon,authenticated;
revoke all on function public.create_assessment_draft(uuid,uuid) from public,anon;
grant execute on function public.create_assessment_draft(uuid,uuid) to authenticated;
commit;
