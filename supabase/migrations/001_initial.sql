-- Executar uma vez no SQL Editor do projeto Supabase. A chave service_role nunca vai ao frontend.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.boards (
  id text primary key, name text not null, active boolean not null default false
);
create table public.subjects (id text primary key, name text not null);
create table public.topics (
  id text primary key, subject_id text not null references public.subjects(id), name text not null,
  concept text not null, example text not null, tip text not null
);
create table public.questions (
  id text primary key, board_id text not null references public.boards(id),
  subject_id text not null references public.subjects(id), topic_id text not null references public.topics(id),
  kind text not null check (kind in ('basic','official')),
  difficulty text not null default 'iniciante', prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 5),
  origin text not null, editorial_status text not null,
  generator_version text, status text not null default 'published' check (status in ('draft','published','annulled')),
  source jsonb,
  created_at timestamptz not null default now(),
  constraint official_provenance check (kind <> 'official' or (
    source is not null and source ?& array['exam','organization','year','role','booklet','number','exam_url','answer_key_url','reviewer','reviewed_at','rights_basis']
    and editorial_status = 'reviewed'
  ))
);
create table private.question_keys (
  question_id text primary key references public.questions(id) on delete cascade,
  correct_index integer not null check (correct_index between 0 and 4), explanation text not null
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, question_id text not null references public.questions(id),
  selected_index integer not null, correct boolean not null,
  kind text not null, topic_id text not null, subject_id text not null,
  elapsed_seconds integer not null check (elapsed_seconds between 0 and 3600),
  created_at timestamptz not null default now(), unique (user_id, request_id)
);
create index attempts_user_topic on public.attempts(user_id, topic_id, kind, created_at desc);
create index questions_filters on public.questions(board_id, subject_id, topic_id, kind, status);

alter table public.boards enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
create policy boards_read on public.boards for select to authenticated using (active);
create policy subjects_read on public.subjects for select to authenticated using (true);
create policy topics_read on public.topics for select to authenticated using (true);
create function public.topic_unlocked(p_topic_id text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select count(*) >= 5 and coalesce(count(*) filter (where correct)::numeric / nullif(count(*), 0), 0) >= 0.7
  from (
    select distinct on (question_id) question_id, correct
    from public.attempts where user_id = (select auth.uid()) and topic_id = p_topic_id and kind = 'basic'
    order by question_id, created_at desc, id desc
  ) latest;
$$;
revoke all on function public.topic_unlocked(text) from public, anon;
grant execute on function public.topic_unlocked(text) to authenticated;
create policy questions_read on public.questions for select to authenticated using (
  status = 'published' and (kind = 'basic' or public.topic_unlocked(topic_id))
);
create policy attempts_read_own on public.attempts for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.boards, public.subjects, public.topics, public.questions, public.attempts from anon, authenticated;
grant select on public.boards, public.subjects, public.topics, public.questions, public.attempts to authenticated;

create function public.submit_answer(p_question_id text, p_selected_index integer, p_elapsed_seconds integer, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_q public.questions; v_key private.question_keys;
  v_attempt public.attempts; v_total integer; v_correct integer;
begin
  if v_uid is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  if p_request_id is null or p_selected_index is null or p_elapsed_seconds is null or p_elapsed_seconds not between 0 and 3600 then
    raise exception 'Resposta inválida.' using errcode = '22023'; end if;
  -- Serializa respostas do mesmo aluno; idempotência também em requisições simultâneas.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  select * into v_attempt from public.attempts where user_id = v_uid and request_id = p_request_id;
  if found then
    if v_attempt.question_id <> p_question_id or v_attempt.selected_index <> p_selected_index then
      raise exception 'Identificador de resposta reutilizado com outros dados.' using errcode = '22023'; end if;
    select * into v_key from private.question_keys where question_id = p_question_id;
    return to_jsonb(v_attempt) - 'user_id' || jsonb_build_object('correct_index', v_key.correct_index, 'explanation', v_key.explanation);
  end if;
  select * into v_q from public.questions where id = p_question_id and status = 'published';
  if not found then raise exception 'Questão não disponível.' using errcode = 'P0002'; end if;
  if p_selected_index < 0 or p_selected_index >= jsonb_array_length(v_q.options) then
    raise exception 'Alternativa inválida.' using errcode = '22023'; end if;
  if v_q.kind = 'official' then
    if not public.topic_unlocked(v_q.topic_id) then
      raise exception 'Conclua 5 questões básicas distintas com pelo menos 70%% de acerto neste assunto.' using errcode = '42501'; end if;
  end if;
  select * into v_key from private.question_keys where question_id = p_question_id;
  if not found then raise exception 'Questão sem gabarito.' using errcode = 'P0002'; end if;
  insert into public.attempts(user_id, request_id, question_id, selected_index, correct, kind, topic_id, subject_id, elapsed_seconds)
  values (v_uid, p_request_id, v_q.id, p_selected_index, p_selected_index = v_key.correct_index, v_q.kind, v_q.topic_id, v_q.subject_id, p_elapsed_seconds)
  returning * into v_attempt;
  return to_jsonb(v_attempt) - 'user_id' || jsonb_build_object('correct_index', v_key.correct_index, 'explanation', v_key.explanation);
end $$;
revoke all on function public.submit_answer(text, integer, integer, uuid) from public, anon;
grant execute on function public.submit_answer(text, integer, integer, uuid) to authenticated;

create function public.question_inventory() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('total', count(*), 'basic', count(*) filter (where kind = 'basic'),
    'official', count(*) filter (where kind = 'official'), 'generated', count(*) filter (where editorial_status = 'generated'),
    'curated', count(*) filter (where kind = 'basic' and editorial_status <> 'generated'))
  from public.questions where status = 'published' and board_id = 'vunesp';
$$;
revoke all on function public.question_inventory() from public, anon;
grant execute on function public.question_inventory() to authenticated;

-- Importação administrativa atômica: enunciado e chave nunca ficam pela metade.
create function public.admin_import_questions(p_questions jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare item jsonb; n integer := 0; qid text;
begin
  for item in select value from jsonb_array_elements(p_questions) loop
    qid := item->>'id';
    if (item->>'correct_index')::integer < 0 or (item->>'correct_index')::integer >= jsonb_array_length(item->'options') then
      raise exception 'Gabarito fora das alternativas: %', qid; end if;
    if exists(select 1 from public.attempts where question_id = qid) and (
      exists(select 1 from public.questions where id = qid and (prompt <> item->>'prompt' or options <> item->'options')) or
      exists(select 1 from private.question_keys where question_id = qid and correct_index <> (item->>'correct_index')::integer)
    ) then raise exception 'Questão já respondida não pode mudar enunciado, opções ou gabarito: %', qid; end if;
    insert into public.questions(id, board_id, subject_id, topic_id, kind, difficulty, prompt, options, origin, editorial_status, generator_version, source, status)
    values(qid, item->>'board_id', item->>'subject_id', item->>'topic_id', item->>'kind', item->>'difficulty', item->>'prompt', item->'options', item->>'origin', item->>'editorial_status', item->>'generator_version', item->'source', coalesce(item->>'status','published'))
    on conflict(id) do update set source = excluded.source, status = excluded.status;
    insert into private.question_keys(question_id, correct_index, explanation)
    values(qid, (item->>'correct_index')::integer, item->>'explanation')
    on conflict(question_id) do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.admin_import_questions(jsonb) from public, anon, authenticated;
grant execute on function public.admin_import_questions(jsonb) to service_role;
grant usage on schema private to service_role;
grant all on private.question_keys to service_role;
commit;
