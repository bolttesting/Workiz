create table if not exists public.platform_settings (
  id text primary key,
  quiz_pass_mark integer not null default 70,
  due_soon_days integer not null default 7,
  invite_days integer not null default 7,
  certificate_issuer text not null default 'WORKIZ',
  updated_at timestamptz not null default now()
);

alter table public.platform_settings
  add column if not exists whatsapp text not null default '+971 4 320 8888',
  add column if not exists phone text not null default '+971 4 320 8888',
  add column if not exists emails text[] not null default '{hello@workiz.com}',
  add column if not exists address text not null default 'Workiz Support Solutions - FZCO, Dubai Silicon Oasis, Dubai, United Arab Emirates';

insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
