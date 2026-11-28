-- ==========================================================================
-- ExpenseFlow: show who uploaded each Class Output
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Safe to run again. (New projects get this from setup.sql already.)
-- ==========================================================================

-- 1. Each group member's display name (emails stay private; only names are shown)
alter table public.admins add column if not exists name text;

insert into public.admins (email, name) values
  ('22-15952@g.batstate-u.edu.ph', 'Jhayvic D. Bugtong'),
  ('23-75760@g.batstate-u.edu.ph', 'Saipoden D. Banto'),
  ('23-73105@g.batstate-u.edu.ph', 'Kier Andrei D. Catibog')
on conflict (email) do update set name = excluded.name;

-- 2. Uploader's name on each output
alter table public.outputs add column if not exists uploaded_by text;

-- 3. Fill it in automatically from the logged-in account, so nobody can
--    type in someone else's name. Edits from the website keep the original
--    uploader. (In the SQL Editor there is no website login, so you can
--    still set or fix it by hand there.)
create or replace function public.set_output_uploader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  login_email text := lower(auth.jwt() ->> 'email');
begin
  if login_email is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.uploaded_by := (select name from public.admins where email = login_email);
  else
    new.uploaded_by := old.uploaded_by;
  end if;
  return new;
end;
$$;

drop trigger if exists set_output_uploader on public.outputs;
create trigger set_output_uploader
  before insert or update on public.outputs
  for each row execute function public.set_output_uploader();

-- 4. Optional: outputs added before today have no uploader yet.
--    Set them by hand, e.g. (change the title and name):
-- update public.outputs set uploaded_by = 'Jhayvic D. Bugtong'
--   where title = 'Business Model Canvas';
