-- Run this in Supabase SQL editor before using the app in production.
-- Date reference: March 1, 2026.

create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gif_url text not null,
  category text not null check (category in ('fuerza', 'movilidad')),
  created_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  category text not null check (category in ('fuerza', 'movilidad')),
  routine_date date,
  day text not null check (day in ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  repetitions text not null,
  plan_type text not null check (plan_type in ('semanal', 'mensual')),
  created_at timestamptz not null default now()
);

alter table public.routines
  add column if not exists routine_date date;

alter table public.routines
  drop constraint if exists routines_repetitions_check;

alter table public.routines
  alter column repetitions type text using repetitions::text;

create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  category text not null check (category in ('fuerza', 'movilidad')),
  plan_type text not null check (plan_type in ('semanal', 'mensual')),
  start_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.routine_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  repetitions integer not null check (repetitions > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.recorded_classes (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('fuerza', 'yoga')),
  title text not null,
  youtube_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('fuerza', 'yoga')),
  title text not null,
  class_datetime timestamptz not null,
  meet_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.personalized_yoga (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  youtube_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.welcome_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.training_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, completion_date)
);

create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, live_class_id)
);

create table if not exists public.video_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_type text not null check (video_type in ('welcome', 'yoga')),
  video_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, video_type, video_id)
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists role text default 'cliente';

-- Minimal policies for development.
alter table public.clients enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_templates enable row level security;
alter table public.routine_template_items enable row level security;
alter table public.recorded_classes enable row level security;
alter table public.live_classes enable row level security;
alter table public.personalized_yoga enable row level security;
alter table public.welcome_videos enable row level security;
alter table public.training_completions enable row level security;
alter table public.class_attendance enable row level security;
alter table public.video_views enable row level security;

drop policy if exists "dev read all clients" on public.clients;
create policy "dev read all clients" on public.clients for select to authenticated using (true);
drop policy if exists "dev modify all clients" on public.clients;
create policy "dev modify all clients" on public.clients for all to authenticated using (true) with check (true);

drop policy if exists "dev read all exercises" on public.exercises;
create policy "dev read all exercises" on public.exercises for select to authenticated using (true);
drop policy if exists "dev modify all exercises" on public.exercises;
create policy "dev modify all exercises" on public.exercises for all to authenticated using (true) with check (true);

drop policy if exists "dev read all routines" on public.routines;
create policy "dev read all routines" on public.routines for select to authenticated using (true);
drop policy if exists "dev modify all routines" on public.routines;
create policy "dev modify all routines" on public.routines for all to authenticated using (true) with check (true);

drop policy if exists "dev read all templates" on public.routine_templates;
create policy "dev read all templates" on public.routine_templates for select to authenticated using (true);
drop policy if exists "dev modify all templates" on public.routine_templates;
create policy "dev modify all templates" on public.routine_templates for all to authenticated using (true) with check (true);

drop policy if exists "dev read all template items" on public.routine_template_items;
create policy "dev read all template items" on public.routine_template_items for select to authenticated using (true);
drop policy if exists "dev modify all template items" on public.routine_template_items;
create policy "dev modify all template items" on public.routine_template_items for all to authenticated using (true) with check (true);

drop policy if exists "dev read all recorded classes" on public.recorded_classes;
create policy "dev read all recorded classes" on public.recorded_classes for select to authenticated using (true);
drop policy if exists "dev modify all recorded classes" on public.recorded_classes;
create policy "dev modify all recorded classes" on public.recorded_classes for all to authenticated using (true) with check (true);

drop policy if exists "dev read all live classes" on public.live_classes;
create policy "dev read all live classes" on public.live_classes for select to authenticated using (true);
drop policy if exists "dev modify all live classes" on public.live_classes;
create policy "dev modify all live classes" on public.live_classes for all to authenticated using (true) with check (true);

drop policy if exists "dev read all personalized yoga" on public.personalized_yoga;
create policy "dev read all personalized yoga" on public.personalized_yoga for select to authenticated using (true);
drop policy if exists "dev modify all personalized yoga" on public.personalized_yoga;
create policy "dev modify all personalized yoga" on public.personalized_yoga for all to authenticated using (true) with check (true);

drop policy if exists "dev read all welcome videos" on public.welcome_videos;
create policy "dev read all welcome videos" on public.welcome_videos for select to authenticated using (true);
drop policy if exists "dev modify all welcome videos" on public.welcome_videos;
create policy "dev modify all welcome videos" on public.welcome_videos for all to authenticated using (true) with check (true);

drop policy if exists "own training completions" on public.training_completions;
create policy "own training completions" on public.training_completions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attendance" on public.class_attendance;
create policy "own attendance" on public.class_attendance for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own video views" on public.video_views;
create policy "own video views" on public.video_views for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
