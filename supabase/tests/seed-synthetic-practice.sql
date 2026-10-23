-- Operator-only persistent synthetic fixture upgrade. Run once, not a rollback test.
begin;
insert into public.material_versions(material_key,version,approval_status,definition,notice_version,processing_scope_version)
select material_key,2,'approved',
  '{"synthetic":true,"protocol":"text-practice-v1","items":[{"key":"practice-1","phase":"practice","prompt":"Latihan teknis: ketik kata contoh."}]}'::jsonb,
  notice_version,processing_scope_version
from public.material_versions where id='90000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','1326aa5a-f29a-4c00-bc5d-f2728d4eff1f',true);
select public.create_assessment_draft(s.teacher_assignment_id,v.id) as id_draf_latihan
from public.assessment_sessions s
join public.material_versions old on old.id=s.material_version_id
join public.material_versions v on v.material_key=old.material_key and v.version=2
where old.id='90000000-0000-4000-8000-000000000001';
commit;
