-- Operator-only persistent synthetic fixture: reading-5pos-v1 material (version 3) and a draft session. Run once.
begin;
insert into public.material_versions(material_key,version,approval_status,definition,notice_version,processing_scope_version)
select material_key,3,'approved',
  '{"synthetic":true,"protocol":"reading-5pos-v1","items":[
    {"key":"pos1-susun","phase":"warmup","encounterType":"letter_arrange","prompt":"Ketik huruf pertama dari kata: buku"},
    {"key":"pos2-eja","phase":"practice","encounterType":"spelling_image","prompt":"Ketik nama benda ini: kucing"},
    {"key":"pos3-kata","phase":"screening","encounterType":"word_read","prompt":"Bacalah dengan suara: pohon rindang"},
    {"key":"pos4-bacaan","phase":"screening","encounterType":"passage_read","prompt":"Bacalah dengan suara: Kancil berjalan di pinggir hutan."},
    {"key":"pos5-paham","phase":"screening","encounterType":"comprehension","prompt":"Ketik: Di mana Kancil berjalan?"}]}'::jsonb,
  notice_version,processing_scope_version
from public.material_versions where id='90000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','1326aa5a-f29a-4c00-bc5d-f2728d4eff1f',true);
select public.create_assessment_draft(s.teacher_assignment_id,v.id) as id_draf_membaca
from public.assessment_sessions s
join public.material_versions old on old.id=s.material_version_id
join public.material_versions v on v.material_key=old.material_key and v.version=3
where old.id='90000000-0000-4000-8000-000000000001' limit 1;
commit;
