-- Operator-only synthetic fixture: recording consent notice + grant for the synthetic guardian link. No real child or real audio.
begin;
insert into public.consent_notices(purpose,notice_version,processing_scope_version,notice_text,processing_scope,enabled)
values('recording','synthetic-mode-v1','synthetic-mode-s1','PEMBERITAHUAN SINTETIS. Rekaman suara hanya untuk pengujian teknis.','Rekaman suara uji, tanpa anak nyata dan tanpa AI.',true);
insert into public.consent_events(guardian_link_id,purpose,decision,notice_version,processing_scope_version)
values('dd447fa2-ec21-4e98-9b83-ab011e301158','recording','grant','synthetic-mode-v1','synthetic-mode-s1');
commit;
