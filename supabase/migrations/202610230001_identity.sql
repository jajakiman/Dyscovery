begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text check (char_length(btrim(full_name)) between 1 and 150),
  display_name text check (char_length(btrim(display_name)) between 1 and 150),
  product_role text check (product_role in ('teacher', 'guardian', 'psychologist')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deactivated')),
  identity_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (identity_confirmed_at is null or full_name is not null)
);

create table public.teacher_profiles (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  nip text check (nip ~ '^[0-9]{18}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;

revoke all on public.profiles, public.teacher_profiles from anon, authenticated;
grant select on public.profiles, public.teacher_profiles to authenticated;
grant update (full_name, display_name) on public.profiles to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) and account_status = 'active');
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()) and account_status = 'active')
  with check (id = (select auth.uid()) and account_status = 'active');
create policy teacher_profiles_read_self on public.teacher_profiles for select to authenticated
  using (profile_id = (select auth.uid()) and exists (
    select 1 from public.profiles p where p.id = profile_id and p.account_status = 'active'
  ));

create function public.touch_identity_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if tg_table_name = 'profiles' then
    if new.full_name is distinct from old.full_name then
      new.identity_confirmed_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.touch_identity_updated_at();
create trigger teacher_profiles_updated before update on public.teacher_profiles
for each row execute function public.touch_identity_updated_at();

create function public.create_pending_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_pending_profile() from public, anon, authenticated;
revoke all on function public.touch_identity_updated_at() from public, anon, authenticated;
create trigger auth_user_pending_profile after insert on auth.users
for each row execute function public.create_pending_profile();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

commit;
