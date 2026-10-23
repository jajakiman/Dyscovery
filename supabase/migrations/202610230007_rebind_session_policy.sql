begin;

-- Renaming a function preserves policy dependencies on its original OID.
alter policy sessions_assigned_read on public.assessment_sessions
using (
  public.can_access_assigned_child(child_id) and exists (
    select 1 from public.material_versions v where v.id = material_version_id
      and public.has_effective_consent(child_id,'activity',v.notice_version,v.processing_scope_version)
  )
);

commit;
