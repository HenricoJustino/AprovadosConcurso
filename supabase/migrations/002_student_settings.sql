-- Executar após 001_initial.sql, inclusive em projetos já existentes.
begin;
create table public.student_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  daily_goal integer not null default 20 check (daily_goal between 5 and 200)
);
alter table public.student_settings enable row level security;
revoke all on public.student_settings from anon, authenticated;
grant select, insert, update on public.student_settings to authenticated;
create policy settings_read_own on public.student_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy settings_insert_own on public.student_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy settings_update_own on public.student_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
commit;
