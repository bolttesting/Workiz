-- Direct-play URL for Hostinger/public hosting (S3/HLS can come later)

alter table public.media_assets
  add column if not exists public_url text;
