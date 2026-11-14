-- Executar após 001_initial.sql e 002_student_settings.sql.
-- Mantém a implementação privilegiada fora do schema exposto pela API.
begin;
alter table private.question_keys enable row level security;
do $$
begin
  if not exists(select 1 from pg_policies where schemaname='private' and tablename='question_keys' and policyname='question_keys_service_only') then
    create policy question_keys_service_only on private.question_keys for all to service_role using (true) with check (true);
  end if;
  if to_regprocedure('private.grade_answer(text,integer,integer,uuid)') is null then
    execute replace(pg_get_functiondef('public.submit_answer(text,integer,integer,uuid)'::regprocedure),
      'FUNCTION public.submit_answer(', 'FUNCTION private.grade_answer(');
  end if;
end $$;
revoke all on function private.grade_answer(text,integer,integer,uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.grade_answer(text,integer,integer,uuid) to authenticated;
create or replace function public.submit_answer(p_question_id text,p_selected_index integer,p_elapsed_seconds integer,p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.grade_answer(p_question_id,p_selected_index,p_elapsed_seconds,p_request_id);
$$;
revoke all on function public.submit_answer(text,integer,integer,uuid) from public,anon;
grant execute on function public.submit_answer(text,integer,integer,uuid) to authenticated;
alter function public.question_inventory() security invoker;
grant all on public.boards,public.subjects,public.topics,public.questions,public.attempts,public.student_settings to service_role;
create index if not exists attempts_question_id_idx on public.attempts(question_id);
create index if not exists questions_subject_id_idx on public.questions(subject_id);
create index if not exists questions_topic_id_idx on public.questions(topic_id);
create index if not exists topics_subject_id_idx on public.topics(subject_id);
commit;
