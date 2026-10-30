begin;

-- Allow authorized psychologists with active report share to verify effective consent
create or replace function public.has_effective_consent(target_child uuid, p_purpose text, p_notice_version text, p_processing_scope_version text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (
    public.can_access_guardian_child(target_child)
    or public.assigned_child_without_mode(target_child)
    or exists (
      select 1 from public.report_shares rs
      join public.report_versions rv on rv.id = rs.report_version_id
      join public.assessment_sessions s on s.id = rv.session_id
      where s.child_id = target_child
        and rs.psychologist_id = (select auth.uid())
        and rs.revoked_at is null
        and rs.expires_at > clock_timestamp()
    )
  )
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

commit;
