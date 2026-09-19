-- Demo catalog (safe to re-run)
insert into public.courses (slug, title, subtitle, description, thumbnail_url, price_cents, published, duration_minutes, level)
values
  (
    'leadership-foundations',
    'Leadership Foundations',
    'Lead teams with clarity and calm.',
    'A practical course on setting direction, running 1:1s, and giving feedback that lands.',
    '/assets/images/inner-img/course-thumb1.png',
    7900,
    true,
    180,
    'Leadership'
  ),
  (
    'product-thinking',
    'Product Thinking for Operators',
    'Ship work that customers actually want.',
    'Discovery, prioritization, and writing specs your engineers will thank you for.',
    '/assets/images/inner-img/course-thumb2.png',
    9900,
    true,
    240,
    'Product'
  ),
  (
    'workplace-communication',
    'Workplace Communication',
    'Write and speak so people act.',
    'Async updates, difficult conversations, and presentation structure for busy teams.',
    '/assets/images/inner-img/course-thumb3.png',
    5900,
    true,
    120,
    'Communication'
  )
on conflict (slug) do update set
  level = excluded.level,
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  price_cents = excluded.price_cents,
  duration_minutes = excluded.duration_minutes,
  published = excluded.published;
