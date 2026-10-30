begin;

-- Expand audit_events outcome constraint to allow consultation outcomes
alter table public.audit_events drop constraint if exists audit_events_outcome_check;
alter table public.audit_events add constraint audit_events_outcome_check
  check (outcome in ('success', 'denied', 'revoked', 'failed', 'accepted', 'declined', 'completed'));

-- Normalize respond_consultation_request to log 'success'
create or replace function public.respond_consultation_request(
  p_request_id uuid,
  p_status text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  req_row public.consultation_requests%rowtype;
begin
  if p_status not in ('accepted', 'declined', 'completed') then
    raise exception 'Invalid consultation status' using errcode = '22023';
  end if;

  select * into req_row from public.consultation_requests where id = p_request_id;
  if not found or req_row.psychologist_id <> auth.uid() then
    raise exception 'Consultation request not found or unauthorized' using errcode = '42501';
  end if;

  update public.consultation_requests
    set status = p_status, updated_at = clock_timestamp()
    where id = p_request_id;

  insert into public.audit_events (actor_id, action, object_type, object_id, outcome)
  values (auth.uid(), 'respond_consultation_request', 'consultation_requests', p_request_id, 'success');

  return true;
end;
$$;

commit;
