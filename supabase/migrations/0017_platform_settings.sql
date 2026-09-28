create table if not exists public.platform_settings (
  id text primary key,
  quiz_pass_mark integer not null default 70,
  due_soon_days integer not null default 7,
  invite_days integer not null default 7,
  certificate_issuer text not null default 'WORKIZ',
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
