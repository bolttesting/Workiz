-- Course reviews and Q&A

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index if not exists course_reviews_course_idx on public.course_reviews (course_id, created_at desc);

create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  answer_body text,
  answered_by uuid references public.profiles (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_questions_course_idx on public.course_questions (course_id, created_at desc);
create index if not exists course_questions_unanswered_idx
  on public.course_questions (created_at desc)
  where answer_body is null;

alter table public.course_reviews enable row level security;
alter table public.course_questions enable row level security;

-- Public can read reviews and answered questions via API (service role).
-- Keep RLS open for authenticated inserts if needed later; API uses service role.
do $$ begin
  create policy "course_reviews_public_read" on public.course_reviews
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "course_questions_public_read" on public.course_questions
    for select using (true);
exception when duplicate_object then null; end $$;
