begin;
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, profile_id),
  unique (id, school_id),
  check (status <> 'active' or verified_at is not null)
);
create table public.children (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 150),
  grade text not null check (grade = '2'),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id)
);
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  school_member_id uuid not null,
  child_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active','revoked','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (school_member_id, school_id) references public.school_members(id,school_id) on delete restrict,
  foreign key (child_id, school_id) references public.children(id,school_id) on delete restrict,
  check (ends_at is null or ends_at > starts_at)
);
create index teacher_assignments_access on public.teacher_assignments(school_member_id,child_id);
create index teacher_assignments_child on public.teacher_assignments(child_id);

create function public.validate_active_teacher_member() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'active' and not exists (
    select 1 from public.profiles p where p.id = new.profile_id
    and p.product_role = 'teacher' and p.verification_status = 'verified' and p.account_status = 'active'
  ) then raise exception 'Active membership requires verified teacher'; end if;
  return new;
end;
$$;
revoke all on function public.validate_active_teacher_member() from public, anon, authenticated;
create trigger school_members_validate before insert or update on public.school_members
for each row execute function public.validate_active_teacher_member();

-- Definer avoids policy recursion; only returns a boolean for the current user.
create function public.can_access_assigned_child(target_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_assignments a
    join public.school_members m on m.id = a.school_member_id and m.school_id = a.school_id
    join public.profiles p on p.id = m.profile_id
    join public.schools s on s.id = a.school_id
    join public.children c on c.id = a.child_id and c.school_id = a.school_id
    where a.child_id = target_child and p.id = auth.uid()
      and p.product_role = 'teacher' and p.verification_status = 'verified' and p.account_status = 'active'
      and s.verification_status = 'verified' and m.status = 'active' and m.verified_at is not null
      and c.status = 'active' and a.status = 'active' and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  );
$$;
revoke all on function public.can_access_assigned_child(uuid) from public, anon;
grant execute on function public.can_access_assigned_child(uuid) to authenticated;

alter table public.schools enable row level security;
alter table public.school_members enable row level security;
alter table public.children enable row level security;
alter table public.teacher_assignments enable row level security;
revoke all on public.schools,public.school_members,public.children,public.teacher_assignments from anon,authenticated;
grant select on public.children to authenticated;
create policy children_assigned_read on public.children for select to authenticated
using (public.can_access_assigned_child(id));

create trigger schools_updated before update on public.schools for each row execute function public.touch_identity_updated_at();
create trigger school_members_updated before update on public.school_members for each row execute function public.touch_identity_updated_at();
create trigger children_updated before update on public.children for each row execute function public.touch_identity_updated_at();
create trigger teacher_assignments_updated before update on public.teacher_assignments for each row execute function public.touch_identity_updated_at();
commit;
