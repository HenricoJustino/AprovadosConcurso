begin;
create table if not exists public.official_exams (
  id text primary key, title text not null, organization text not null,
  role text not null, year integer not null, application_date date not null,
  booklet text not null, exam_url text not null, answer_key_url text not null,
  answer_key_status text not null check(answer_key_status in ('definitive','confirmed_after_appeals')),
  appeals_url text not null, total_questions integer not null,
  published_questions integer not null, annulled_questions integer not null,
  content_sha256 text not null,
  status text not null default 'draft' check(status in ('draft','published')),
  check(total_questions = published_questions + annulled_questions)
);
create table if not exists public.exam_pages (
  exam_id text not null references public.official_exams(id),
  page_number integer not null check(page_number > 0), image_data text not null,
  alt text not null, primary key(exam_id,page_number),
  check(image_data like 'data:image/jpeg;base64,%')
);
alter table public.official_exams add column if not exists content_sha256 text;
alter table public.questions add column if not exists exam_id text references public.official_exams(id);
alter table public.questions add column if not exists question_number integer;
create unique index if not exists questions_exam_number on public.questions(exam_id,question_number) where exam_id is not null;
alter table public.official_exams enable row level security;
alter table public.exam_pages enable row level security;
revoke all on public.official_exams,public.exam_pages from public,anon,authenticated;
grant select on public.official_exams,public.exam_pages to authenticated;
grant all on public.official_exams,public.exam_pages to service_role;
drop policy if exists exams_read on public.official_exams;
create policy exams_read on public.official_exams for select to authenticated using(status='published');
drop policy if exists pages_read on public.exam_pages;
create policy pages_read on public.exam_pages for select to authenticated using(exists(select 1 from public.official_exams e where e.id=exam_id and e.status='published'));
drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions for select to authenticated using (
  status='published' and (kind='basic' or
    (exam_id is not null and exists(select 1 from public.official_exams e where e.id=exam_id and e.status='published')) or
    (exam_id is null and public.topic_unlocked(topic_id)))
);
-- Preserve grading, idempotency, and ownership checks. Applied exams can be
-- practiced directly; the existing basic learning path retains its gate.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('private.grade_answer(text,integer,integer,uuid)'::regprocedure);
  definition := replace(definition, 'if v_q.kind = ''official'' then', 'if v_q.kind = ''official'' and v_q.exam_id is null then');
  if position('Prova indisponível.' in definition)=0 then
    definition := replace(definition, 'if p_selected_index < 0', 'if v_q.exam_id is not null and not exists(select 1 from public.official_exams e where e.id=v_q.exam_id and e.status=''published'') then raise exception ''Prova indisponível.'' using errcode=''P0002''; end if; if p_selected_index < 0');
  end if;
  execute definition;
end $migration$;
commit;
