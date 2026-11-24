-- ==========================================================================
-- ExpenseFlow: Class Outputs database setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- ==========================================================================

-- 1. Table that stores each class activity/output
create table if not exists public.outputs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  activity_date date,
  description   text,
  file_path     text,          -- path of the uploaded file inside the "outputs" storage bucket
  file_name     text,          -- original file name, shown on the button
  created_at    timestamptz not null default now()
);

-- 2. Group members who are allowed to add/delete outputs
create table if not exists public.admins (
  email text primary key
);

-- 3. Helper: is the logged-in user one of the group members?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

-- 4. Security rules for the outputs table
alter table public.outputs enable row level security;
alter table public.admins  enable row level security;   -- no policies = nobody can read it from the website

drop policy if exists "Anyone can view outputs" on public.outputs;
drop policy if exists "Admins can add outputs"    on public.outputs;
drop policy if exists "Admins can edit outputs"   on public.outputs;
drop policy if exists "Admins can delete outputs" on public.outputs;

create policy "Anyone can view outputs"
  on public.outputs for select
  using (true);

create policy "Admins can add outputs"
  on public.outputs for insert to authenticated
  with check (public.is_admin());

create policy "Admins can edit outputs"
  on public.outputs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete outputs"
  on public.outputs for delete to authenticated
  using (public.is_admin());

-- 5. Public storage bucket for the uploaded files (50 MB max per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('outputs', 'outputs', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "Admins can upload output files" on storage.objects;
drop policy if exists "Admins can delete output files" on storage.objects;

create policy "Admins can upload output files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'outputs' and public.is_admin());

create policy "Admins can delete output files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'outputs' and public.is_admin());

-- 6. Add your group members' emails here (lowercase), then run the script.
--    You can run just this part again later to add more people.
insert into public.admins (email) values
  ('22-15952@g.batstate-u.edu.ph'),
  ('23-75760@g.batstate-u.edu.ph'),
  ('23-73105@g.batstate-u.edu.ph')
on conflict (email) do nothing;
