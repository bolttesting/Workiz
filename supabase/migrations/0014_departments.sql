alter table public.profiles
  add column if not exists department text;

alter table public.invites
  add column if not exists department text;
