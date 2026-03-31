-- WriteRight demo schema
-- Run in Supabase SQL editor.

create table if not exists public.wr_users (
  email text primary key,
  name text not null,
  checks integer not null default 0,
  words integer not null default 0,
  joined_at bigint not null,
  provider text,
  model text,
  updated_at timestamptz not null default now()
);

create table if not exists public.wr_history (
  id bigint generated always as identity primary key,
  email text not null,
  time bigint not null,
  input_preview text,
  full_input text,
  output text,
  mode text,
  created_at timestamptz not null default now()
);

create index if not exists wr_history_email_time_idx on public.wr_history(email, time desc);

-- Demo-only permissive policies (no Supabase Auth wired yet).
alter table public.wr_users enable row level security;
alter table public.wr_history enable row level security;

drop policy if exists wr_users_open_read on public.wr_users;
drop policy if exists wr_users_open_write on public.wr_users;
drop policy if exists wr_history_open_read on public.wr_history;
drop policy if exists wr_history_open_write on public.wr_history;

create policy wr_users_open_read on public.wr_users
for select to anon using (true);

create policy wr_users_open_write on public.wr_users
for insert to anon with check (true);

create policy wr_users_open_update on public.wr_users
for update to anon using (true) with check (true);

create policy wr_history_open_read on public.wr_history
for select to anon using (true);

create policy wr_history_open_write on public.wr_history
for insert to anon with check (true);
