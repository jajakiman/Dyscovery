begin;

-- Allow guardians to read assessment sessions of their verified linked children
create policy sessions_guardian_read on public.assessment_sessions
for select to authenticated using (
  public.can_access_guardian_child(child_id)
);

commit;
