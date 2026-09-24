-- Blog CMS for Workiz marketing site
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_html text not null default '',
  category text,
  thumb_url text,
  author_name text not null default 'Workiz Team',
  author_image_url text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_idx on public.blog_posts (published, published_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

drop policy if exists "Public read published blog posts" on public.blog_posts;
create policy "Public read published blog posts"
  on public.blog_posts for select
  using (published = true);

-- Seed from previous static posts (idempotent)
insert into public.blog_posts (
  slug, title, excerpt, content_html, category, thumb_url,
  author_name, author_image_url, seo_title, seo_description, published, published_at
)
values
(
  'strategies-for-online-learning',
  '10 Proven Strategies to Excel at Online Learning',
  'Practical habits that help employees finish assigned courses and help companies get value from every seat.',
  '<p>Online learning works best when people treat it like a real work commitment, not a spare-time hobby. Set a weekly study block, open the same course until you finish the next lesson, and track progress in WORKIZ so managers can see what is getting done.</p><p>For companies, the win is seat utilization. Assign a short path, review quiz results, and celebrate certificates. That keeps training connected to the job instead of a catalog nobody opens.</p><p>Start with one course per person, not ten. Completion beats browsing.</p><blockquote><p>Finish one lesson before you open the next. Progress compounds when focus stays narrow.</p></blockquote>',
  'Learning',
  '/assets/images/home-one/blog-thumb1.png',
  'John D. Alexon',
  '/assets/images/home-one/blog-autor1.png',
  '10 Proven Strategies to Excel at Online Learning | Workiz',
  'Practical habits that help employees finish assigned courses and help companies get value from every seat.',
  true,
  '2026-01-28T10:00:00Z'
),
(
  'trends-shaping-learning',
  'Trends That Are Shaping the Learning Experience',
  'Recorded lessons, quizzes, and certificates are becoming the default for busy teams.',
  '<p>Teams want learning that fits around work. That is why WORKIZ focuses on recorded video, structured lessons, and certificates instead of forcing everyone onto live calls.</p><p>Seat contracts are rising because companies want one platform where admins create accounts and assign the right courses by department.</p><p>The trend is ownership. Platform instructors teach the catalog you publish — not a marketplace of random sellers.</p><blockquote><p>The best learning experience is the one people can finish between meetings.</p></blockquote>',
  'Product',
  '/assets/images/home-one/blog-thumb2.png',
  'Anjelina Watson',
  '/assets/images/home-one/blog-autor2.png',
  'Trends That Are Shaping the Learning Experience | Workiz',
  'Recorded lessons, quizzes, and certificates are becoming the default for busy teams.',
  true,
  '2026-01-29T10:00:00Z'
),
(
  'soft-skills-and-professional-growth',
  'Learning Soft Skills for Professional Growth',
  'Communication, leadership, and workplace habits travel with every role change.',
  '<p>Hard skills get you hired. Soft skills help you stay effective with customers and teammates. WORKIZ courses cover both so companies can train the whole team from one seat plan.</p><p>Quizzes check understanding. Certificates give learners a clear finish line. Managers get a simple signal that training happened.</p><p>Build a short soft-skills path first: communication, feedback, and leadership foundations. Then expand the catalog.</p><blockquote><p>Professional growth sticks when practice, feedback, and proof of completion stay in one place.</p></blockquote>',
  'Careers',
  '/assets/images/home-one/blog-thumb3.png',
  'David X. Barmer',
  '/assets/images/home-one/blog-autor3.png',
  'Learning Soft Skills for Professional Growth | Workiz',
  'Communication, leadership, and workplace habits travel with every role change.',
  true,
  '2026-01-30T10:00:00Z'
)
on conflict (slug) do nothing;
