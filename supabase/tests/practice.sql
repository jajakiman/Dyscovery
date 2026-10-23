begin;
insert into auth.users(id) values ('91000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$ begin
  begin
    perform public.student_practice();
    raise exception 'Unbound student read allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_student_practice('practice-1','uji',gen_random_uuid());
    raise exception 'Unbound student write allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.practice_responses(session_id,item_key,response,request_id)
      values(gen_random_uuid(),'practice-1','uji',gen_random_uuid());
    raise exception 'Direct insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
