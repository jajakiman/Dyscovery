begin;

alter table public.profiles drop constraint profiles_product_role_check;
alter table public.profiles add constraint profiles_product_role_check
  check (product_role in ('teacher', 'guardian', 'psychologist', 'operator'));

commit;
