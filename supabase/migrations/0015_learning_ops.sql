alter table public.enrollments
  add column if not exists due_at date;

alter table public.invites
  add column if not exists course_due jsonb not null default '{}'::jsonb;

create table if not exists public.course_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  course_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.course_sets enable row level security;

alter table public.certificates
  add column if not exists number text;

create unique index if not exists certificates_number_idx on public.certificates (number);

alter table public.organizations
  add column if not exists current_period_end timestamptz;
