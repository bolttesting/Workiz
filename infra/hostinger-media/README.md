# WORKIZ media on Hostinger
#
# Deployed to: https://test.hub71.site/upload.php
# Public files: https://test.hub71.site/media/...
#
# 1. Copy upload.php to public_html (set $SECRET to match MEDIA_UPLOAD_SECRET).
# 2. In LMS .env:
#    MEDIA_PUBLIC_BASE_URL=https://test.hub71.site/media
#    MEDIA_UPLOAD_URL=https://test.hub71.site/upload.php
#    MEDIA_UPLOAD_SECRET=<same secret>
# 3. Restart the API.
# 4. Run supabase/migrations/0010_media_public_url.sql in Supabase.
#
# S3 stays optional for later (HLS + CDN).
