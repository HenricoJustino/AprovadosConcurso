-- Teste transacional: usuários e respostas sintéticos não são persistidos.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); q record;
begin
  perform set_config('aprovados_test.a',a::text,true);
  perform set_config('aprovados_test.b',b::text,true);
  perform set_config('aprovados_test.request',gen_random_uuid()::text,true);
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(a,'authenticated','authenticated',a::text||'@example.invalid','{}','{}',now(),now()),
        (b,'authenticated','authenticated',b::text||'@example.invalid','{}','{}',now(),now());
  select p.id,k.correct_index into q from public.questions p join private.question_keys k on k.question_id=p.id where p.topic_id='regencia' and p.kind='basic' limit 1;
  perform set_config('aprovados_test.question',q.id,true);
  perform set_config('aprovados_test.answer',q.correct_index::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;
set local role authenticated;
do $$
declare r jsonb; duplicate jsonb;
begin
  r := public.submit_answer(current_setting('aprovados_test.question'),current_setting('aprovados_test.answer')::integer,10,current_setting('aprovados_test.request')::uuid);
  if not (r->>'correct')::boolean then raise exception 'Correção falhou'; end if;
  duplicate := public.submit_answer(current_setting('aprovados_test.question'),current_setting('aprovados_test.answer')::integer,10,current_setting('aprovados_test.request')::uuid);
  if duplicate->>'id' <> r->>'id' then raise exception 'Idempotência falhou'; end if;
  if (select count(*) from public.attempts) <> 1 then raise exception 'Tentativa duplicada'; end if;
  if (public.question_inventory()->>'basic')::integer <> 10053 then raise exception 'Acervo incompleto'; end if;
  insert into public.student_settings(user_id,daily_goal) values(auth.uid(),35);
  begin
    perform question_id from private.question_keys limit 1;
    raise exception 'Gabarito exposto';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('aprovados_test.b'),true);
set local role authenticated;
do $$
declare affected integer;
begin
  if (select count(*) from public.attempts) <> 0 then raise exception 'Histórico de A exposto para B'; end if;
  if (select count(*) from public.student_settings) <> 0 then raise exception 'Meta de A exposta para B'; end if;
  update public.student_settings set daily_goal=200 where user_id=current_setting('aprovados_test.a')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'B alterou meta de A'; end if;
  begin
    insert into public.student_settings(user_id,daily_goal) values(current_setting('aprovados_test.a')::uuid,99);
    raise exception 'B criou dados em nome de A';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.submit_answer(current_setting('aprovados_test.question'),0,1,gen_random_uuid());
    raise exception 'Anônimo conseguiu responder';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select jsonb_build_object('grading',true,'idempotency',true,'user_isolation',true,'answer_keys_hidden',true,'anonymous_denied',true) as validation;
rollback;
