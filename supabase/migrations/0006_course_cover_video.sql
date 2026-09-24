-- Optional promo / cover video for course detail hero

alter table public.courses
  add column if not exists cover_video_url text;

comment on column public.courses.cover_video_url is 'Optional trailer/cover video shown on the marketing course page';
