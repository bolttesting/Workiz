-- Instructors are platform teachers you assign to courses. Not a marketplace.
-- Postgres cannot use a new enum value in the same transaction as ADD VALUE.
-- Compare role as text here so this file can run in one SQL-editor pass.

alter type public.user_role add value if not exists 'instructor';

create table if not exists public.instructor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  slug text unique not null,
  headline text,
  bio text,
  public_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.course_instructors (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Instructor',
  sort_order integer not null default 0,
  primary key (course_id, user_id)
);

create index if not exists course_instructors_user_idx on public.course_instructors (user_id);

create or replace function public.is_instructor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role::text = 'instructor')
$$;

create or replace function public.instructs_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.course_instructors
    where course_id = cid and user_id = auth.uid()
  )
$$;

alter table public.instructor_profiles enable row level security;
alter table public.course_instructors enable row level security;

drop policy if exists "instructor profiles public" on public.instructor_profiles;
create policy "instructor profiles public" on public.instructor_profiles for select using (
  public_visible or user_id = auth.uid() or public.is_super_admin()
);

drop policy if exists "instructor profiles admin write" on public.instructor_profiles;
create policy "instructor profiles admin write" on public.instructor_profiles for all using (
  public.is_super_admin() or user_id = auth.uid()
) with check (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "course instructors public" on public.course_instructors;
create policy "course instructors public" on public.course_instructors for select using (true);

drop policy if exists "course instructors admin write" on public.course_instructors;
create policy "course instructors admin write" on public.course_instructors for all using (
  public.is_super_admin()
) with check (public.is_super_admin());

drop policy if exists "enrollments instructor read" on public.enrollments;
create policy "enrollments instructor read" on public.enrollments for select using (
  public.instructs_course(course_id)
);

drop policy if exists "progress instructor read" on public.lesson_progress;
create policy "progress instructor read" on public.lesson_progress for select using (
  exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.course_instructors ci on ci.course_id = m.course_id
    where l.id = lesson_id and ci.user_id = auth.uid()
  )
);

drop policy if exists "attempts instructor read" on public.quiz_attempts;
create policy "attempts instructor read" on public.quiz_attempts for select using (
  exists (
    select 1
    from public.quizzes q
    join public.lessons l on l.id = q.lesson_id
    join public.modules m on m.id = l.module_id
    join public.course_instructors ci on ci.course_id = m.course_id
    where q.id = quiz_id and ci.user_id = auth.uid()
  )
);
