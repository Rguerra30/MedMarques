create table public.study_roadmaps (
 user_id uuid primary key references auth.users(id) on delete cascade,
 weeks jsonb not null check (jsonb_typeof(weeks)='array')
);
alter table public.study_roadmaps enable row level security;
revoke all on public.study_roadmaps from public, anon, authenticated;
grant select on public.study_roadmaps to authenticated;
create policy "Student reads own roadmap" on public.study_roadmaps
 for select to authenticated using ((select auth.uid())=user_id);
