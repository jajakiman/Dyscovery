begin;

-- Qualify report_versions.id to fix variable shadowing in subquery
drop policy if exists report_versions_psychologist_shared_read on public.report_versions;
create policy report_versions_psychologist_shared_read on public.report_versions
for select to authenticated using (
  status = 'published' and exists (
    select 1 from public.report_shares rs
    where rs.report_version_id = report_versions.id
      and rs.psychologist_id = (select auth.uid())
      and rs.revoked_at is null
      and rs.expires_at > clock_timestamp()
  )
);

-- Qualify recordings.session_id to prevent self-referencing rv.session_id
drop policy if exists recordings_psychologist_shared_read on public.recordings;
create policy recordings_psychologist_shared_read on public.recordings
for select to authenticated using (
  exists (
    select 1 from public.report_shares rs
    join public.report_versions rv on rv.id = rs.report_version_id
    where rv.session_id = recordings.session_id
      and rs.psychologist_id = (select auth.uid())
      and rs.revoked_at is null
      and rs.expires_at > clock_timestamp()
      and (rs.scope->>'include_audio')::boolean = true
  )
);

commit;
