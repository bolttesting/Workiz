-- Downloadable files (PDFs, etc.) attached to lectures

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  file_key text not null,
  file_url text,
  content_type text not null default 'application/pdf',
  byte_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lesson_resources_lesson_idx
  on public.lesson_resources (lesson_id, sort_order);

alter table public.lesson_resources enable row level security;

do $$ begin
  create policy "lesson_resources_public_read" on public.lesson_resources
    for select using (true);
exception when duplicate_object then null; end $$;
