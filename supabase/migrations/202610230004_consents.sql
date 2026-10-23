begin;

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete restrict,
  relationship text not null check (relationship in ('parent','guardian')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (guardian_id,child_id),
  check (verification_status <> 'verified' or verified_at is not null)
);
create index guardian_links_child on public.guardian_links(child_id);

create table public.consent_notices (
  purpose text not null check (purpose in ('activity','recording','ai')),
  notice_version text not null check (char_length(btrim(notice_version)) between 1 and 80),
  processing_scope_version text not null check (char_length(btrim(processing_scope_version)) between 1 and 80),
  notice_text text not null check (char_length(btrim(notice_text)) between 1 and 20000),
  processing_scope text not null check (char_length(btrim(processing_scope)) between 1 and 20000),
  enabled boolean not null default false,
  primary key (purpose,notice_version,processing_scope_version)
);

create table public.consent_events (
  id bigint generated always as identity primary key,
  guardian_link_id uuid not null references public.guardian_links(id) on delete restrict,
  purpose text not null,
  decision text not null check (decision in ('grant','deny','withdraw')),
  notice_version text not null,
  processing_scope_version text not null,
  recorded_at timestamptz not null default clock_timestamp(),
  foreign key (purpose,notice_version,processing_scope_version)
    references public.consent_notices(purpose,notice_version,processing_scope_version) on delete restrict
);
create index consent_events_latest on public.consent_events
  (guardian_link_id,purpose,notice_version,processing_scope_version,id desc);

create function public.guard_consent_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'consent_notices' and tg_op = 'UPDATE'
    and (to_jsonb(new) - 'enabled') = (to_jsonb(old) - 'enabled') then return new; end if;
  raise exception 'Consent history and notice content are immutable';
end;
$$;
create trigger consent_events_immutable before update or delete on public.consent_events
for each row execute function public.guard_consent_history();
create trigger consent_notices_immutable before update or delete on public.consent_notices
for each row execute function public.guard_consent_history();

create function public.validate_guardian_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.guardian_id <> old.guardian_id or new.child_id <> old.child_id) then
    raise exception 'Guardian link identity is immutable';
  end if;
  perform 1 from public.children where id = new.child_id for update;
  if new.verification_status = 'verified' and new.revoked_at is null then
    if not exists (select 1 from public.profiles where id = new.guardian_id
      and product_role = 'guardian' and verification_status = 'verified' and account_status = 'active'
      and identity_confirmed_at is not null) then raise exception 'Verified guardian required'; end if;
    if tg_op = 'INSERT' then
      new.verified_at = clock_timestamp();
    elsif old.verification_status <> 'verified' or old.revoked_at is not null then
      new.verified_at = clock_timestamp();
    elsif new.verified_at is distinct from old.verified_at then
      raise exception 'Verification timestamp is immutable while active';
    end if;
  end if;
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
create trigger guardian_links_validate before insert or update on public.guardian_links
for each row execute function public.validate_guardian_link();

create function public.can_access_guardian_child(target_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.guardian_links g
    join public.profiles p on p.id = g.guardian_id
    join public.children c on c.id = g.child_id
    where g.child_id = target_child and p.id = auth.uid()
      and p.product_role = 'guardian' and p.verification_status = 'verified'
      and p.account_status = 'active' and p.identity_confirmed_at is not null
      and g.verification_status = 'verified' and g.revoked_at is null and c.status = 'active');
$$;

create function public.has_effective_consent(target_child uuid, p_purpose text, p_notice_version text, p_processing_scope_version text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (public.can_access_guardian_child(target_child) or public.can_access_assigned_child(target_child))
    and exists (select 1 from public.consent_notices where purpose = p_purpose
      and notice_version = p_notice_version and processing_scope_version = p_processing_scope_version and enabled)
    and exists (select 1 from public.guardian_links where child_id = target_child
      and verification_status = 'verified' and revoked_at is null)
    and not exists (
      select 1 from public.guardian_links g join public.profiles p on p.id = g.guardian_id
      where g.child_id = target_child and g.verification_status = 'verified' and g.revoked_at is null
        and (p.product_role is distinct from 'guardian' or p.verification_status <> 'verified'
          or p.account_status <> 'active' or p.identity_confirmed_at is null
          or coalesce((select e.decision from public.consent_events e
            where e.guardian_link_id = g.id and e.purpose = p_purpose
              and e.notice_version = p_notice_version and e.processing_scope_version = p_processing_scope_version
              and e.recorded_at >= g.verified_at
            order by e.id desc limit 1), 'deny') <> 'grant')
    );
$$;

create function public.record_guardian_consent(p_guardian_link_id uuid, p_purpose text, p_decision text,
  p_notice_version text, p_processing_scope_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_child uuid;
begin
  if p_decision is null or p_decision not in ('grant','deny','withdraw') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  select child_id into target_child from public.guardian_links
    where id = p_guardian_link_id and guardian_id = auth.uid();
  perform 1 from public.children where id = target_child for update;
  if target_child is null or not public.can_access_guardian_child(target_child)
    or not exists (select 1 from public.guardian_links where id = p_guardian_link_id
      and guardian_id = auth.uid() and verification_status = 'verified' and revoked_at is null) then
    raise exception 'Guardian access unavailable' using errcode = '42501';
  end if;
  perform 1 from public.consent_notices where purpose = p_purpose and notice_version = p_notice_version
    and processing_scope_version = p_processing_scope_version and (enabled or p_decision = 'withdraw') for share;
  if not found then raise exception 'Notice unavailable' using errcode = '22023'; end if;
  insert into public.consent_events(guardian_link_id,purpose,decision,notice_version,processing_scope_version)
    values(p_guardian_link_id,p_purpose,p_decision,p_notice_version,p_processing_scope_version);
end;
$$;

alter table public.guardian_links enable row level security;
alter table public.consent_notices enable row level security;
alter table public.consent_events enable row level security;
revoke all on public.guardian_links,public.consent_notices,public.consent_events from public,anon,authenticated;
revoke all on sequence public.consent_events_id_seq from public,anon,authenticated;
grant select on public.guardian_links,public.consent_notices,public.consent_events to authenticated;
create policy guardian_links_self_read on public.guardian_links for select to authenticated
  using (guardian_id = auth.uid() and public.can_access_guardian_child(child_id));
create policy consent_notices_read on public.consent_notices for select to authenticated using (true);
create policy consent_events_self_read on public.consent_events for select to authenticated using (
  exists (select 1 from public.guardian_links g where g.id = guardian_link_id and g.guardian_id = auth.uid())
);
create policy children_guardian_read on public.children for select to authenticated
  using (public.can_access_guardian_child(id));

revoke all on function public.guard_consent_history(),public.validate_guardian_link() from public,anon,authenticated;
revoke all on function public.can_access_guardian_child(uuid),
  public.has_effective_consent(uuid,text,text,text),public.record_guardian_consent(uuid,text,text,text,text) from public,anon;
grant execute on function public.can_access_guardian_child(uuid),
  public.has_effective_consent(uuid,text,text,text),public.record_guardian_consent(uuid,text,text,text,text) to authenticated;
commit;
