-- Marketing fields for course detail page (What you'll learn / Who it's for)

alter table public.courses
  add column if not exists learning_outcomes text[] not null default '{}',
  add column if not exists audience text[] not null default '{}';

comment on column public.courses.learning_outcomes is 'Bullet list shown as What you will learn';
comment on column public.courses.audience is 'Tags shown as Who it is for';

-- Seed defaults for existing demo courses (only if still empty)
update public.courses
set learning_outcomes = array[
  'Set clear weekly priorities your team can actually follow',
  'Run meetings that end with owners, dates, and next steps',
  'Give feedback that improves performance without friction',
  'Coach new managers through their first 90 days'
]
where slug = 'leadership-foundations'
  and coalesce(cardinality(learning_outcomes), 0) = 0;

update public.courses
set audience = array[
  'New managers',
  'Team leads',
  'Department heads',
  'High-potential ICs'
]
where slug = 'leadership-foundations'
  and coalesce(cardinality(audience), 0) = 0;
