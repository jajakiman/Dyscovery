-- Operator-only persistent synthetic fixture: 4-pos material (version 5: benda, hewan, susun kata, membaca) and a draft session. Needs migration 025. Run once.
begin;
insert into public.material_versions(material_key,version,approval_status,definition,notice_version,processing_scope_version)
select material_key,5,'approved',
  '{"synthetic":true,"protocol":"reading-5pos-v1","items":[
    {"key":"pos1-benda","phase":"screening","encounterType":"spelling_image","prompt":"Benda apa ini?","image":"/assets/bola.svg","choices":["bola","bula","dola"]},
    {"key":"pos2-hewan","phase":"screening","encounterType":"spelling_image","prompt":"Apa hewan ini?","image":"/assets/kucing.svg","choices":["kucing","kusing","kuncing"]},
    {"key":"pos3-susun","phase":"screening","encounterType":"letter_arrange","prompt":"Susun huruf menjadi nama benda di gambar.","image":"/assets/kelapa.svg","tiles":["P","A","K","E","A","L"]},
    {"key":"pos4-bacaan","phase":"screening","encounterType":"passage_read","prompt":"Budi pergi ke kebun bersama Ibu. Mereka memetik kelapa di bawah pohon rindang."}]}'::jsonb,
  notice_version,processing_scope_version
from public.material_versions where id='90000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','1326aa5a-f29a-4c00-bc5d-f2728d4eff1f',true);
select public.create_assessment_draft(s.teacher_assignment_id,v.id) as id_draf_4pos
from public.assessment_sessions s
join public.material_versions old on old.id=s.material_version_id
join public.material_versions v on v.material_key=old.material_key and v.version=5
where old.id='90000000-0000-4000-8000-000000000001' limit 1;
commit;
