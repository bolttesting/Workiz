-- Lesson notes, course requests, and certificate validity.

create table if not exists public.lesson_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_notes enable row level security;

create table if not exists public.course_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint course_requests_status check (status in ('pending', 'assigned', 'dismissed'))
);

create unique index if not exists course_requests_open_idx
  on public.course_requests (user_id, course_id)
  where status = 'pending';

alter table public.course_requests enable row level security;

alter table public.courses add column if not exists certificate_months integer;
alter table public.certificates add column if not exists expires_at timestamptz;
