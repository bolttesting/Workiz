create table if not exists public.seat_plans (
  id text primary key,
  name text not null,
  blurb text not null default '',
  seats integer not null,
  monthly_cents integer not null,
  price_per_seat_cents integer,
  min_seats integer,
  max_seats integer,
  custom boolean not null default false,
  popular boolean not null default false,
  features text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.seat_plans (
  id, name, blurb, seats, monthly_cents, price_per_seat_cents, min_seats, max_seats, custom, popular, features, sort_order
) values
  (
    'growth',
    'Growth',
    'Multi-department workforces with admin course assignment.',
    100,
    34900,
    null,
    null,
    null,
    false,
    true,
    array[
      '100 learner seats',
      'Multi-department admin tools',
      'Priority course assignment',
      'Progress dashboards',
      'Priority support'
    ],
    1
  ),
  (
    'custom',
    'Custom',
    'Pick the exact seats you need — priced per learner.',
    250,
    500000,
    2000,
    50,
    500,
    true,
    false,
    array[
      '__SEATS__ learner seats',
      'Everything in Growth',
      'Dedicated onboarding help',
      'Custom training rollout support',
      'Account manager'
    ],
    2
  )
on conflict (id) do nothing;

alter table public.seat_plans enable row level security;

drop policy if exists "seat plans public read" on public.seat_plans;
create policy "seat plans public read" on public.seat_plans
  for select using (active = true);
