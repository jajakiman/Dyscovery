begin;

-- Allow verified guardians to read approved material versions
create policy materials_guardian_read on public.material_versions
for select to authenticated using (
  approval_status = 'approved' and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and p.product_role = 'guardian' and p.verification_status = 'verified'
      and p.account_status = 'active' and p.identity_confirmed_at is not null
  )
);

commit;
