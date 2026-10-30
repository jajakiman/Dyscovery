begin;

-- Read-only view of the caller's own active assignments; avoids granting table access.
create function public.my_assignments() returns table(id uuid, child_id uuid)
language sql stable security definer set search_path = '' as $$
  select a.id, a.child_id from public.teacher_assignments a
  join public.school_members m on m.id = a.school_member_id and m.school_id = a.school_id
  where m.profile_id = auth.uid() and a.status = 'active' and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now()) and public.can_access_assigned_child(a.child_id);
$$;
revoke all on function public.my_assignments() from public, anon;
grant execute on function public.my_assignments() to authenticated;

commit;
