-- Public bucket for course/blog images and lesson handouts when S3 is not configured

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

do $$ begin
  create policy "uploads_public_read"
    on storage.objects for select
    using (bucket_id = 'uploads');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "uploads_service_write"
    on storage.objects for insert
    with check (bucket_id = 'uploads');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "uploads_service_update"
    on storage.objects for update
    using (bucket_id = 'uploads');
exception when duplicate_object then null; end $$;
