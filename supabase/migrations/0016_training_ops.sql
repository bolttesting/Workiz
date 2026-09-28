alter table public.course_sets
  add column if not exists ordered boolean not null default false;

alter table public.lesson_progress
  add column if not exists seconds_spent integer not null default 0;

alter table public.organizations
  add column if not exists dashboard_note text;

alter table public.profiles
  add column if not exists department_lead boolean not null default false;

create table if not exists public.org_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

alter table public.org_activity enable row level security;
