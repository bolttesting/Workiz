-- Workix LMS schema
create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('super_admin', 'company_admin', 'company_learner', 'individual_learner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lesson_type as enum ('video', 'article', 'quiz');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_source as enum ('purchase', 'seat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_status as enum ('uploaded', 'processing', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_kind as enum ('course', 'seats');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_status as enum ('incomplete', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  seat_limit integer not null default 0,
  seat_used integer not null default 0,
  status public.org_status not null default 'incomplete',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'individual_learner',
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text,
  thumbnail_url text,
  price_cents integer not null default 0,
  currency text not null default 'usd',
  published boolean not null default false,
  duration_minutes integer not null default 0,
  level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  type public.lesson_type not null default 'video',
  article_content text,
  duration_seconds integer not null default 0,
  sort_order integer not null default 0,
  is_preview boolean not null default false,
  quiz_id uuid
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid unique not null references public.lessons (id) on delete cascade,
  original_key text not null,
  hls_prefix text,
  status public.media_status not null default 'uploaded',
  content_type text,
  byte_size bigint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source public.enrollment_source not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  position_seconds integer not null default 0,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid unique references public.lessons (id) on delete cascade,
  title text not null,
  passing_score integer not null default 70
);

alter table public.lessons
  drop constraint if exists lessons_quiz_id_fkey;
alter table public.lessons
  add constraint lessons_quiz_id_fkey foreign key (quiz_id) references public.quizzes (id) on delete set null;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  sort_order integer not null default 0
);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null,
  is_correct boolean not null default false
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score integer not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  kind public.order_kind not null,
  course_id uuid references public.courses (id) on delete set null,
  seat_quantity integer,
  amount_cents integer not null,
  currency text not null default 'usd',
  status public.order_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  number text unique not null,
  pdf_key text,
  amount_cents integer not null,
  currency text not null default 'usd',
  issued_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  pdf_key text,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  token text unique not null,
  role public.user_role not null default 'company_learner',
  status public.invite_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists courses_published_idx on public.courses (published);
create index if not exists modules_course_idx on public.modules (course_id, sort_order);
create index if not exists lessons_module_idx on public.lessons (module_id, sort_order);
create index if not exists enrollments_user_idx on public.enrollments (user_id);
create index if not exists invites_org_idx on public.invites (organization_id, status);
create index if not exists invites_token_idx on public.invites (token);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'individual_learner')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
$$;

create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'company_admin')
$$;

create or replace function public.same_org(org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and organization_id is not null and organization_id = org_id
  )
$$;

create or replace function public.has_active_seat()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid()
      and p.role in ('company_admin', 'company_learner')
      and o.status = 'active'
      and o.seat_limit > 0
  )
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.media_assets enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.orders enable row level security;
alter table public.invoices enable row level security;
alter table public.certificates enable row level security;
alter table public.invites enable row level security;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (
  id = auth.uid() or public.is_super_admin() or (
    organization_id is not null and public.same_org(organization_id) and public.is_company_admin()
  )
);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations
drop policy if exists "org members read" on public.organizations;
create policy "org members read" on public.organizations for select using (
  public.is_super_admin() or public.same_org(id)
);

-- courses: published catalog is public; unpublished admin only
drop policy if exists "courses public read" on public.courses;
create policy "courses public read" on public.courses for select using (published or public.is_super_admin());
drop policy if exists "courses admin write" on public.courses;
create policy "courses admin write" on public.courses for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "modules public read" on public.modules;
create policy "modules public read" on public.modules for select using (
  public.is_super_admin() or exists (select 1 from public.courses c where c.id = course_id and c.published)
);
drop policy if exists "modules admin write" on public.modules;
create policy "modules admin write" on public.modules for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "lessons public read" on public.lessons;
create policy "lessons public read" on public.lessons for select using (
  public.is_super_admin() or exists (
    select 1 from public.modules m join public.courses c on c.id = m.course_id
    where m.id = module_id and c.published
  )
);
drop policy if exists "lessons admin write" on public.lessons;
create policy "lessons admin write" on public.lessons for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "media admin read" on public.media_assets;
create policy "media admin read" on public.media_assets for select using (
  public.is_super_admin() or exists (
    select 1 from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid()
    where l.id = lesson_id
  ) or (
    public.has_active_seat() and exists (
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
      where l.id = lesson_id and c.published
    )
  )
);

drop policy if exists "enrollments own" on public.enrollments;
create policy "enrollments own" on public.enrollments for select using (
  user_id = auth.uid() or public.is_super_admin() or (
    public.is_company_admin() and exists (
      select 1 from public.profiles p
      where p.id = user_id and public.same_org(p.organization_id)
    )
  )
);
drop policy if exists "enrollments insert own" on public.enrollments;
create policy "enrollments insert own" on public.enrollments for insert with check (user_id = auth.uid());

drop policy if exists "progress own" on public.lesson_progress;
create policy "progress own" on public.lesson_progress for all using (
  user_id = auth.uid() or public.is_super_admin() or (
    public.is_company_admin() and exists (
      select 1 from public.profiles p where p.id = user_id and public.same_org(p.organization_id)
    )
  )
) with check (user_id = auth.uid());

drop policy if exists "quizzes read" on public.quizzes;
create policy "quizzes read" on public.quizzes for select using (true);
drop policy if exists "quiz questions read" on public.quiz_questions;
create policy "quiz questions read" on public.quiz_questions for select using (true);
drop policy if exists "quiz options read" on public.quiz_options;

drop policy if exists "attempts own" on public.quiz_attempts;
create policy "attempts own" on public.quiz_attempts for select using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "attempts insert" on public.quiz_attempts;
create policy "attempts insert" on public.quiz_attempts for insert with check (user_id = auth.uid());

drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders for select using (
  user_id = auth.uid() or public.is_super_admin() or (organization_id is not null and public.same_org(organization_id))
);

drop policy if exists "invoices own" on public.invoices;
create policy "invoices own" on public.invoices for select using (
  public.is_super_admin() or exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.same_org(o.organization_id))
  )
);

drop policy if exists "certs own" on public.certificates;
create policy "certs own" on public.certificates for select using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "invites org" on public.invites;
create policy "invites org" on public.invites for select using (
  public.is_super_admin() or public.same_org(organization_id)
);
