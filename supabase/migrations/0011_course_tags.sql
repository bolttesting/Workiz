-- Freeform course tags for catalog discovery

alter table public.courses
  add column if not exists tags text[] not null default '{}';
