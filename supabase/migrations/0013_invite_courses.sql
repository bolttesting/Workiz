alter table public.invites
  add column if not exists course_ids uuid[] not null default '{}';
