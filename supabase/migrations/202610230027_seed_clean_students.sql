begin;

-- 1. Rename schools to realistic names
update public.schools
set name = 'SD Negeri Nusantara 01'
where id = 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5';

update public.schools
set name = 'SD Negeri Nusantara 02'
where id = '10000000-0000-4000-8000-000000000001';

-- 2. Update existing children to realistic names
update public.children
set display_name = 'Bima Aditia', grade = '2'
where id = '490d3e70-4130-46ec-8be2-b7e8a112b249';

update public.children
set display_name = 'Ahmad Fauzi', grade = '2'
where id = '10000000-0000-4000-8000-000000000003';

-- 3. Insert additional students for primary school (SD Negeri Nusantara 01)
insert into public.children (id, school_id, display_name, grade, status)
values
  ('50000000-0000-4000-8000-000000000001', 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5', 'Ayu Rahma', '2', 'active'),
  ('50000000-0000-4000-8000-000000000002', 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5', 'Doni Pratama', '2', 'active'),
  ('50000000-0000-4000-8000-000000000003', 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5', 'Siti Aisyah', '2', 'active'),
  ('50000000-0000-4000-8000-000000000004', 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5', 'Rian Hidayat', '2', 'active')
on conflict (id) do update set
  display_name = excluded.display_name,
  grade = excluded.grade,
  status = excluded.status;

-- 4. Update guardian profile to realistic name and reconfirm identity
update public.profiles
set full_name = 'Ratna Handayani', display_name = 'Ibu Ratna (Wali Murid)'
where id = 'b050a328-c4ed-4223-941f-9c0f3ca56db9';

update public.profiles
set identity_confirmed_at = now()
where id = 'b050a328-c4ed-4223-941f-9c0f3ca56db9';

-- 5. Ensure guardian links for all children
insert into public.guardian_links (id, guardian_id, child_id, relationship, verification_status)
values
  ('60000000-0000-4000-8000-000000000001', 'b050a328-c4ed-4223-941f-9c0f3ca56db9', '10000000-0000-4000-8000-000000000003', 'parent', 'verified'),
  ('60000000-0000-4000-8000-000000000002', 'b050a328-c4ed-4223-941f-9c0f3ca56db9', '50000000-0000-4000-8000-000000000001', 'parent', 'verified'),
  ('60000000-0000-4000-8000-000000000003', 'b050a328-c4ed-4223-941f-9c0f3ca56db9', '50000000-0000-4000-8000-000000000002', 'parent', 'verified'),
  ('60000000-0000-4000-8000-000000000004', 'b050a328-c4ed-4223-941f-9c0f3ca56db9', '50000000-0000-4000-8000-000000000003', 'parent', 'verified'),
  ('60000000-0000-4000-8000-000000000005', 'b050a328-c4ed-4223-941f-9c0f3ca56db9', '50000000-0000-4000-8000-000000000004', 'parent', 'verified')
on conflict (id) do nothing;

-- 6. Grant consents (activity, recording, ai) for all guardian links
insert into public.consent_events (guardian_link_id, purpose, decision, notice_version, processing_scope_version)
select g.id, p.purpose, 'grant', 'synthetic-mode-v1', 'synthetic-mode-s1'
from public.guardian_links g
cross join (values ('activity'), ('recording'), ('ai')) as p(purpose)
where g.verification_status = 'verified' and g.revoked_at is null
  and not exists (
    select 1 from public.consent_events e
    where e.guardian_link_id = g.id and e.purpose = p.purpose
      and e.notice_version = 'synthetic-mode-v1' and e.processing_scope_version = 'synthetic-mode-s1'
  );

-- 7. Ensure teacher assignments for school members of SD Negeri Nusantara 01
insert into public.teacher_assignments (school_id, school_member_id, child_id, starts_at, status)
select 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5', m.id, c.id, now() - interval '1 hour', 'active'
from public.school_members m
cross join public.children c
where m.school_id = 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5'
  and c.school_id = 'b615a90a-afd6-4983-a7fd-5f8f9dc6d8c5'
  and not exists (
    select 1 from public.teacher_assignments a
    where a.school_member_id = m.id and a.child_id = c.id and a.status = 'active'
  );

-- 8. Ensure draft sessions exist for all students with latest approved material
insert into public.assessment_sessions (id, teacher_assignment_id, child_id, material_version_id, status)
select gen_random_uuid(), a.id, a.child_id, '21fc347c-3118-42e8-bc4b-144d83d90615', 'draft'
from public.teacher_assignments a
join public.school_members m on m.id = a.school_member_id
where m.profile_id = 'f8486417-fb39-4206-a6a4-4eddf3442263'
  and not exists (
    select 1 from public.assessment_sessions s
    where s.child_id = a.child_id and s.status in ('draft', 'in_progress')
  );

commit;
